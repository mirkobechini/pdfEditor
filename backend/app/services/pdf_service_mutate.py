"""Sign/annotate/OCR mixin for PdfService (extracted from pdf_service.py).

Contains the shared ``_mutate_pdf_document`` boilerplate plus the three
operations that use it: sign, annotate, OCR.
"""
from typing import Any, Callable

from app.core.storage import save_pdf, validate_pdf
from app.models.pdf import PdfDocument
from app.services.pdf_service_utils import _NoChange


class PdfServiceMutateMixin:
    """In-place PDF mutations: signing, annotations, OCR."""

    def _mutate_pdf_document(
        self,
        pdf_id: str,
        user_id: str,
        mutate: Callable[[Any], Any],
        error_label: str,
    ) -> tuple[PdfDocument, Any]:
        """Shared boilerplate for operations that rewrite a PDF's content in
        place (sign/annotate/OCR): load the owned PDF, snapshot it, open it
        with fitz, run `mutate(doc)`, validate the result, save it as the new
        content and update the DB record.

        `mutate` receives the open fitz.Document and returns whatever extra
        value the caller needs back (e.g. OCR's character count), or a
        `_NoChange(extra)` to skip saving/updating (e.g. OCR on a PDF that's
        already searchable). Returns (pdf, extra).
        """
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)
        self._create_snapshot(pdf_id, user_id)

        content = self._read_file_with_password(pdf_id, user_id)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        doc = fitz.open(stream=content, filetype="pdf")
        try:
            extra = mutate(doc)
            if isinstance(extra, _NoChange):
                return pdf, extra.value
            output_bytes = doc.tobytes()
        finally:
            doc.close()

        if not validate_pdf(output_bytes):
            raise ValueError(f"{error_label} produced an invalid PDF")

        file_uuid = save_pdf(output_bytes)

        pdf.storage_filename = f"{file_uuid}.pdf"
        pdf.file_size = len(output_bytes)

        return self.repo.update(pdf), extra

    def sign_pdf(
        self,
        pdf_id: str,
        user_id: str,
        signature_image: bytes,
        page_number: int,
        x: float,
        y: float,
        width: float,
        height: float,
    ) -> PdfDocument:
        """Insert a signature image onto a PDF page and save as a new PDF.

        Args:
            pdf_id: the PDF to sign.
            user_id: owner of the PDF.
            signature_image: PNG/JPEG bytes of the signature.
            page_number: 1-based page index to place the signature on.
            x, y: top-left coordinates (in PDF points) where to place the image.
            width, height: size of the signature image in PDF points.
        """
        import fitz

        def mutate(doc):
            if page_number < 1 or page_number > doc.page_count:
                raise ValueError(
                    f"Page {page_number} out of range (1-{doc.page_count})"
                )
            page = doc[page_number - 1]
            # Validate the signature image is a real image fitz can embed
            try:
                page.insert_image(
                    fitz.Rect(x, y, x + width, y + height),
                    stream=signature_image,
                )
            except Exception as e:
                raise ValueError(f"Invalid signature image: {e}")

        pdf, _ = self._mutate_pdf_document(pdf_id, user_id, mutate, "Signing")
        return pdf

    def add_annotation(
        self,
        pdf_id: str,
        user_id: str,
        page_number: int,
        annotation_type: str,
        rect: tuple[float, float, float, float],
        color: str = "#FFFF00",
        content: str | None = None,
        points: list[tuple[float, float]] | None = None,
        opacity: float = 0.3,
    ) -> PdfDocument:
        """Add an annotation to a PDF page and save as a new PDF.

        Supported types: highlight, underline, strikeout, text, free_text, draw.
        Annotations are embedded in the PDF (standard PDF annotations).
        """
        import fitz

        def mutate(doc):
            if page_number < 1 or page_number > doc.page_count:
                raise ValueError(
                    f"Page {page_number} out of range (1-{doc.page_count})"
                )
            page = doc[page_number - 1]
            rect_obj = fitz.Rect(*rect)

            if annotation_type == "highlight":
                annot = page.add_highlight_annot(rect_obj)
            elif annotation_type == "underline":
                annot = page.add_underline_annot(rect_obj)
            elif annotation_type == "strikeout":
                annot = page.add_strikeout_annot(rect_obj)
            elif annotation_type == "text":
                # Use free-text annotation so the comment text is visible on
                # the page (add_text_annot creates a popup icon with hidden text).
                annot = page.add_freetext_annot(
                    rect_obj, content or "", fontsize=11
                )
            elif annotation_type == "free_text":
                annot = page.add_freetext_annot(
                    rect_obj, content or "", fontsize=11
                )
            elif annotation_type == "draw":
                if not points or len(points) < 2:
                    raise ValueError("Draw annotation requires at least 2 points")
                annot = page.add_polyline_annot(
                    [fitz.Point(p[0], p[1]) for p in points]
                )
            else:
                raise ValueError(f"Unsupported annotation type: {annotation_type}")

            # Apply color (hex → RGB float)
            try:
                color_hex = color.lstrip("#")
                r = int(color_hex[0:2], 16) / 255
                g = int(color_hex[2:4], 16) / 255
                b = int(color_hex[4:6], 16) / 255
                annot.set_colors(stroke=(r, g, b))
            except Exception:
                pass

            if opacity is not None:
                try:
                    annot.set_opacity(opacity)
                except Exception:
                    pass

            # set_colors()/set_opacity() only stage the change — PyMuPDF
            # doesn't regenerate the annotation's appearance stream until
            # update() is called. Without this, every annotation kept its
            # default appearance (e.g. a fresh highlight is always yellow)
            # no matter what color/opacity was requested.
            annot.update()

        pdf, _ = self._mutate_pdf_document(pdf_id, user_id, mutate, "Annotation")
        return pdf

    def ocr_pdf(
        self,
        pdf_id: str,
        user_id: str,
        language: str = "eng",
    ) -> tuple[PdfDocument, int, bool]:
        """Run OCR on a scanned PDF and return a searchable PDF.

        If the PDF already has a text layer, it is returned unchanged.
        Otherwise, each page is rendered to an image and passed to Tesseract.
        The recognized text is added as an invisible layer (searchable PDF).

        Requires the `tesseract` binary to be installed on the system.

        Returns (pdf, character_count, already_searchable). OCR adds an
        invisible text layer, so the PDF looks visually unchanged — the
        caller uses character_count/already_searchable to tell the user
        something actually happened.
        """
        import fitz

        def mutate(doc):
            # Check if the PDF already has a text layer
            has_text = any(doc[i].get_text().strip() for i in range(doc.page_count))
            if has_text:
                # Already searchable — return unchanged
                return _NoChange((0, True))

            import pytesseract

            # Locate the tesseract binary (PATH, bundled sidecar, or env var).
            # Raises a clear error if the binary is not installed.
            from app.core.tesseract import configure_tesseract, OcrUnavailableError

            if not configure_tesseract():
                raise OcrUnavailableError(
                    "OCR is unavailable: the tesseract binary is not installed "
                    "on this system. Install it or contact the administrator."
                )

            character_count = 0
            for page_num in range(doc.page_count):
                page = doc[page_num]
                # Render page to image at 200 DPI for OCR
                pix = page.get_pixmap(dpi=200)
                img_bytes = pix.tobytes("png")

                # pytesseract needs a PIL Image (or a file path), not raw bytes.
                from PIL import Image
                import io

                img = Image.open(io.BytesIO(img_bytes))

                # Run OCR on the page image
                text = pytesseract.image_to_string(
                    img, lang=language, config="--psm 3"
                )
                stripped = text.strip()
                if stripped:
                    character_count += len(stripped)
                    # Insert recognized text as invisible text layer
                    page.insert_textbox(
                        fitz.Rect(0, 0, page.rect.width, page.rect.height),
                        text,
                        fontsize=1,
                        color=(1, 1, 1),
                        render_mode=3,  # invisible text
                        overlay=True,
                    )

            return character_count, False

        pdf, (character_count, already_searchable) = self._mutate_pdf_document(
            pdf_id, user_id, mutate, "OCR"
        )
        return pdf, character_count, already_searchable