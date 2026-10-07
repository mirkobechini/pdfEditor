"""Password/undo-redo mixin for PdfService (extracted from pdf_service.py)."""
from app.core.storage import save_pdf, save_snapshot, get_latest_snapshot, pop_latest_snapshot
from app.models.pdf import PdfDocument
from app.services.pdf_service_utils import _cache_password


class PdfServicePasswordMixin:
    """Password-protection and undo/redo operations."""

    def unlock(self, pdf_id: str, user_id: str, password: str) -> PdfDocument:
        """Try to unlock a password-protected PDF. Returns the PDF if successful."""
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)

        if not pdf.is_password_protected:
            return pdf  # Not encrypted, nothing to do

        content = self.get_file_content(pdf)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        doc = fitz.open(stream=content, filetype="pdf")
        try:
            if not doc.needs_pass:
                # File was flagged but isn't actually encrypted anymore
                pdf.is_password_protected = False
                self.repo.db.flush()
                return pdf

            auth = doc.authenticate(password)
            if auth == 0:
                raise ValueError("Incorrect password")
        finally:
            doc.close()

        # Cache the password in memory
        _cache_password(pdf_id, password)
        return pdf

    def undo(self, pdf_id: str, user_id: str) -> PdfDocument:
        """Undo the last modification: restore the most recent snapshot."""
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)
        content = get_latest_snapshot(pdf_id)
        if not content:
            raise ValueError("Nothing to undo")

        # Save current state as redo candidate, then restore snapshot
        save_snapshot(f"{pdf_id}_redo", self._read_file_with_password(pdf_id, user_id))
        pop_latest_snapshot(pdf_id)  # remove the snapshot we just read

        file_uuid = save_pdf(content)
        new_name = f"{pdf.original_filename.replace('.pdf', '')}_restored.pdf"

        # Count actual pages with fitz instead of using len(content) (bytes)
        page_count = fitz.open(stream=content, filetype="pdf").page_count

        new_pdf = PdfDocument(
            original_filename=new_name,
            storage_filename=f"{file_uuid}.pdf",
            file_size=len(content),
            page_count=page_count,
            user_id=user_id,
        )
        return self.repo.create(new_pdf)

    def redo(self, pdf_id: str, user_id: str) -> PdfDocument:
        """Redo the last undone operation: restore from redo stack."""
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)
        content = get_latest_snapshot(f"{pdf_id}_redo")
        if not content:
            raise ValueError("Nothing to redo")

        pop_latest_snapshot(f"{pdf_id}_redo")

        file_uuid = save_pdf(content)
        new_name = f"{pdf.original_filename.replace('.pdf', '')}_restored.pdf"

        # Count actual pages with fitz instead of using len(content) (bytes)
        page_count = fitz.open(stream=content, filetype="pdf").page_count

        new_pdf = PdfDocument(
            original_filename=new_name,
            storage_filename=f"{file_uuid}.pdf",
            file_size=len(content),
            page_count=page_count,
            user_id=user_id,
        )
        return self.repo.create(new_pdf)

    def protect(self, pdf_id: str, user_id: str, password: str) -> PdfDocument:
        """Protect a PDF with a password (encryption)."""
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)
        self._create_snapshot(pdf_id, user_id)

        content = self._read_file_with_password(pdf_id, user_id)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        doc = fitz.open(stream=content, filetype="pdf")
        try:
            # Encrypt with AES-256
            output_bytes = doc.tobytes(encryption=fitz.PDF_ENCRYPT_AES_256, user_pw=password)
        finally:
            doc.close()

        file_uuid = save_pdf(output_bytes)

        # Update the existing PDF record with encrypted content
        pdf.storage_filename = f"{file_uuid}.pdf"
        pdf.file_size = len(output_bytes)
        pdf.is_password_protected = True

        # Cache the password in memory
        _cache_password(pdf_id, password)

        return self.repo.update(pdf)