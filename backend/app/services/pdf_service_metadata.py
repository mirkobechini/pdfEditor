"""Metadata/export mixin for PdfService (extracted from pdf_service.py)."""
from datetime import datetime, timezone

from app.core.storage import save_pdf
from app.models.pdf import PdfDocument


class PdfServiceMetadataMixin:
    """PDF metadata read/update and export to other formats."""

    def get_metadata(self, pdf_id: str, user_id: str) -> dict:
        """Get PDF metadata."""
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)

        content = self._read_file_with_password(pdf_id, user_id)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        source = fitz.open(stream=content, filetype="pdf")
        try:
            meta = source.metadata
            return {
                "title": meta.get("title"),
                "author": meta.get("author"),
                "subject": meta.get("subject"),
                "keywords": meta.get("keywords"),
            }
        finally:
            source.close()

    def update_metadata(
        self, pdf_id: str, user_id: str, updates: dict
    ) -> PdfDocument:
        """Update PDF metadata.

        If overwrite=True, updates the existing PDF in-place (same DB record).
        Otherwise, creates a new document preserving the original.
        If new_filename is provided, uses it as the filename.
        """
        self._create_snapshot(pdf_id, user_id)
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)

        content = self._read_file_with_password(pdf_id, user_id)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        source = fitz.open(stream=content, filetype="pdf")
        try:
            new_meta = dict(source.metadata)
            # Update only provided fields — null/empty clears the field
            for key in ("title", "author", "subject", "keywords"):
                if key in updates:
                    new_meta[key] = updates[key] if updates[key] else ""

            source.set_metadata(new_meta)
            out_bytes = source.tobytes()
        finally:
            source.close()

        overwrite = updates.pop("overwrite", False)
        new_filename = updates.pop("new_filename", None)

        if overwrite:
            # Update existing PDF in-place
            file_uuid = save_pdf(out_bytes)
            pdf.storage_filename = f"{file_uuid}.pdf"
            pdf.file_size = len(out_bytes)
            pdf.updated_at = datetime.now(timezone.utc)
            if new_filename:
                pdf.original_filename = new_filename
            return self.repo.update(pdf)
        else:
            # Create new document
            file_uuid = save_pdf(out_bytes)
            if new_filename:
                new_name = new_filename
            else:
                new_name = f"{pdf.original_filename.replace('.pdf', '')}_metadata_updated.pdf"

            new_pdf = PdfDocument(
                original_filename=new_name,
                storage_filename=f"{file_uuid}.pdf",
                file_size=len(out_bytes),
                page_count=pdf.page_count,
                user_id=user_id,
            )
            return self.repo.create(new_pdf)

    def export_pdf(
        self, pdf_id: str, user_id: str, fmt: str
    ) -> tuple[bytes, str]:
        """Export a PDF to another format. Returns (content, media_type)."""
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)

        content = self._read_file_with_password(pdf_id, user_id)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        source = fitz.open(stream=content, filetype="pdf")

        try:
            if fmt == "txt":
                text_parts = []
                for page_num in range(source.page_count):
                    text_parts.append(source[page_num].get_text())
                result = "\n---\n".join(text_parts).encode("utf-8")
                media_type = "text/plain"
                filename = f"{pdf.original_filename.replace('.pdf', '')}.txt"

            elif fmt in ("png", "jpg", "jpeg"):
                ext = "jpeg" if fmt in ("jpg", "jpeg") else "png"
                page = source[0]  # First page only for single image export
                pix = page.get_pixmap(dpi=150)
                result = pix.tobytes(ext)
                media_type = f"image/{ext}"
                filename = f"{pdf.original_filename.replace('.pdf', '')}.{ext}"

            elif fmt == "svg":
                page = source[0]
                svg = page.get_svg_image()
                result = svg.encode("utf-8")
                media_type = "image/svg+xml"
                filename = f"{pdf.original_filename.replace('.pdf', '')}.svg"

            else:
                raise ValueError(f"Unsupported format: {fmt}")

            return result, media_type, filename
        finally:
            source.close()