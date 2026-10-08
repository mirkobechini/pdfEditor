"""Page-editing mixin for PdfService (extracted from pdf_service.py).

reorder/remove_pages/replace_text/extract_text plus the text-replacement
helpers `_find_text_span` and `_safe_text_font`.
"""
from datetime import datetime, timezone

from app.core.storage import save_pdf
from app.models.pdf import PdfDocument


class PdfServiceEditMixin:
    """Page-level edits: reorder, remove pages, replace/extract text."""

    def reorder(self, pdf_id: str, user_id: str, page_order: list[int], output_filename: str | None = None, overwrite: bool = False) -> PdfDocument:
        """Reorder pages of a PDF. page_order is 1-based."""
        self._create_snapshot(pdf_id, user_id)
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)

        content = self._read_file_with_password(pdf_id, user_id)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        source = fitz.open(stream=content, filetype="pdf")
        if len(page_order) != source.page_count:
            source.close()
            raise ValueError(
                f"page_order must contain exactly {source.page_count} pages, "
                f"got {len(page_order)}"
            )

        # Convert 1-based to 0-based
        zero_based = [p - 1 for p in page_order]

        # Validate all indices are valid
        for idx in zero_based:
            if idx < 0 or idx >= source.page_count:
                source.close()
                raise ValueError(f"Page number {idx + 1} is out of range")

        # select() reorders/selects pages from the document
        source.select(zero_based)
        out_bytes = source.tobytes()
        source.close()

        file_uuid = save_pdf(out_bytes)
        if output_filename:
            new_name = output_filename if output_filename.endswith(".pdf") else output_filename + ".pdf"
        else:
            new_name = f"{pdf.original_filename.replace('.pdf', '')}_reordered.pdf"

        if overwrite:
            pdf.storage_filename = f"{file_uuid}.pdf"
            pdf.file_size = len(out_bytes)
            pdf.page_count = len(page_order)
            pdf.original_filename = new_name
            pdf.updated_at = datetime.now(timezone.utc)
            return self.repo.update(pdf)

        new_pdf = PdfDocument(
            original_filename=new_name,
            storage_filename=f"{file_uuid}.pdf",
            file_size=len(out_bytes),
            page_count=len(page_order),
            user_id=user_id,
        )
        return self.repo.create(new_pdf)

    def remove_pages(self, pdf_id: str, user_id: str, page_numbers: list[int], output_filename: str | None = None, overwrite: bool = False) -> PdfDocument:
        """Remove specific pages from a PDF. page_numbers is 1-based."""
        self._create_snapshot(pdf_id, user_id)
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)

        content = self._read_file_with_password(pdf_id, user_id)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        source = fitz.open(stream=content, filetype="pdf")

        # Validate page numbers
        for p in page_numbers:
            if p < 1 or p > source.page_count:
                source.close()
                raise ValueError(
                    f"Page {p} is out of range. PDF has {source.page_count} pages"
                )

        # Convert to 0-based and build list of pages to KEEP
        remove_set = set(p - 1 for p in page_numbers)
        keep_pages = [i for i in range(source.page_count) if i not in remove_set]

        if len(keep_pages) == 0:
            source.close()
            raise ValueError("Cannot remove all pages")

        source.select(keep_pages)
        out_bytes = source.tobytes()
        source.close()

        file_uuid = save_pdf(out_bytes)
        if output_filename:
            new_name = output_filename if output_filename.endswith(".pdf") else output_filename + ".pdf"
        else:
            new_name = f"{pdf.original_filename.replace('.pdf', '')}_pages_removed.pdf"

        if overwrite:
            pdf.storage_filename = f"{file_uuid}.pdf"
            pdf.file_size = len(out_bytes)
            pdf.page_count = len(keep_pages)
            pdf.original_filename = new_name
            pdf.updated_at = datetime.now(timezone.utc)
            return self.repo.update(pdf)

        new_pdf = PdfDocument(
            original_filename=new_name,
            storage_filename=f"{file_uuid}.pdf",
            file_size=len(out_bytes),
            page_count=len(keep_pages),
            user_id=user_id,
        )
        return self.repo.create(new_pdf)

    def replace_text(
        self,
        pdf_id: str,
        user_id: str,
        search: str,
        replace: str,
        occurrence: int | None = None,
        output_filename: str | None = None,
    ) -> PdfDocument:
        """Find and replace text in a PDF. If occurrence is None, replaces all."""
        self._create_snapshot(pdf_id, user_id)
        import fitz

        if not search.strip():
            raise ValueError("Search text cannot be empty")

        pdf = self._get_user_pdf(pdf_id, user_id)

        content = self._read_file_with_password(pdf_id, user_id)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        source = fitz.open(stream=content, filetype="pdf")
        total_replacements = 0

        try:
            for page_num in range(source.page_count):
                page = source[page_num]
                rects = page.search_for(search)

                if not rects:
                    continue

                for rect in rects:
                    if occurrence is not None and total_replacements >= occurrence:
                        break

                    # Find the exact span containing the searched text to
                    # preserve the original font, size and baseline (origin).
                    span_info = self._find_text_span(page, rect, search)

                    # Redact the found text area
                    page.add_redact_annot(rect, fill=None)
                    page.apply_redactions()
                    # Insert replacement text
                    if span_info:
                        fontsize = span_info["size"]
                        fontname = self._safe_text_font(span_info["font"])
                        # x = bordo sinistro della PAROLA trovata (rect.x0),
                        # y = baseline dello span. `span_info["origin"]` è
                        # l'inizio dell'INTERO span: usarlo rimetterebbe il
                        # testo all'inizio dello span quando la parola è nel
                        # mezzo (issue #1016).
                        origin = (rect.x0, span_info["origin"][1])
                    else:
                        # Fallback: estimate from rect
                        fontsize = rect.y1 - rect.y0 - 2
                        if fontsize < 6:
                            fontsize = 10
                        fontname = "helv"
                        origin = (rect.x0, rect.y0 + 1)
                    page.insert_text(
                        origin,
                        replace,
                        fontname=fontname,
                        fontsize=fontsize,
                    )
                    total_replacements += 1

                if occurrence is not None and total_replacements >= occurrence:
                    break

            out_bytes = source.tobytes()
        finally:
            source.close()

        file_uuid = save_pdf(out_bytes)
        if output_filename:
            new_name = output_filename if output_filename.endswith(".pdf") else output_filename + ".pdf"
        else:
            new_name = f"{pdf.original_filename.replace('.pdf', '')}_text_replaced.pdf"

        new_pdf = PdfDocument(
            original_filename=new_name,
            storage_filename=f"{file_uuid}.pdf",
            file_size=len(out_bytes),
            page_count=pdf.page_count,
            user_id=user_id,
        )
        return self.repo.create(new_pdf)

    def _find_text_span(
        self,
        page,
        rect,
        search: str,
        tolerance: float = 1.0,
    ) -> dict | None:
        """Find the text span containing the searched text near a rect.

        Uses ``page.get_text("dict")`` to locate the exact span whose origin
        (baseline) is closest to the found rect. Returns font name, font size
        and baseline origin so replacement text matches the original style.
        """
        data = page.get_text("dict")
        best_span = None
        best_dist = float("inf")

        for block in data.get("blocks", []):
            if block.get("type") != 0:
                continue  # skip image blocks
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    span_text = span.get("text", "")
                    if search not in span_text and span_text.strip() != search:
                        continue
                    # Use baseline origin (x = left, y = baseline)
                    origin = span.get("origin", (rect.x0, rect.y0))
                    dist = abs(origin[0] - rect.x0) + abs(
                        origin[1] - rect.y0
                    )
                    if dist < best_dist:
                        best_dist = dist
                        best_span = span

        if best_span is None:
            return None

        return {
            "font": best_span.get("font", "helv"),
            "size": best_span.get("size", 10),
            "origin": best_span.get("origin", (rect.x0, rect.y0 + 1)),
        }

    def _safe_text_font(self, fontname: str) -> str:
        """Return a font name safe for ``Page.insert_text``.

        PyMuPDF's ``insert_text`` can only use fonts known to it (the built-in
        Base-14 set plus any you registered). Fonts embedded in the source PDF
        (nome file subset, e.g. ``ABCDEE+Calibri``, or arbitrary names) raise
        when passed to ``insert_text`` → the replace-text endpoint returned a
        500 (issue #930). Map anything non-safe back to ``helv``.
        """
        if not fontname:
            return "helv"
        # Subset-embedded fonts have a 6-char prefix + "+" (e.g. ABCDEF+Calibri)
        if "+" in fontname:
            return "helv"
        base = fontname.lower()
        # Base-14 / common safe names (PyMuPDF built-ins): helv, tiro, cour,
        # symb, and "times"/"helvetica"/"courier"/"symbol" aliases.
        if base in {"helv", "hebo", "hobl", "helvetica", "tiro", "tibo",
                    "titi", "tiit", "times", "times-roman", "cour", "cobo",
                    "cob", "coi", "courier", "symb", "symbol", "zadb",
                    "zafb", "dong", "goth"}:
            return fontname
        return "helv"

    def extract_text(self, pdf_id: str, user_id: str, page: int | None = None) -> tuple[str, int]:
        """Extract text from a PDF. If page is None, extracts from all pages."""
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)

        content = self._read_file_with_password(pdf_id, user_id)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        source = fitz.open(stream=content, filetype="pdf")

        try:
            if page is not None:
                if page < 1 or page > source.page_count:
                    raise ValueError(
                        f"Page {page} is out of range. PDF has {source.page_count} pages"
                    )
                text = source[page - 1].get_text()
            else:
                text_parts = []
                for page_num in range(source.page_count):
                    text_parts.append(source[page_num].get_text())
                text = "\n---\n".join(text_parts)

            return text, source.page_count
        finally:
            source.close()