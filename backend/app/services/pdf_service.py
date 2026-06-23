from sqlalchemy.orm import Session

from app.core.storage import save_pdf, validate_pdf, get_pdf_path, delete_pdf
from app.models.pdf import PdfDocument
from app.repositories.pdf_repo import PdfRepository
from app.schemas.pdf import PdfListResponse, PdfResponse


class PdfService:
    """Business logic for PDF operations."""

    def __init__(self, db: Session):
        self.repo = PdfRepository(db)

    def upload(self, filename: str, content: bytes) -> PdfDocument:
        """Validate, save to disk, and create DB record."""
        # Validate PDF
        if not validate_pdf(content):
            raise ValueError("Invalid PDF file")

        # Save to storage
        file_uuid = save_pdf(content)

        # Get page count with PyMuPDF
        import fitz

        doc = fitz.open(stream=content, filetype="pdf")
        page_count = doc.page_count
        doc.close()

        # Create DB record
        pdf = PdfDocument(
            original_filename=filename,
            storage_filename=f"{file_uuid}.pdf",
            file_size=len(content),
            page_count=page_count,
        )
        return self.repo.create(pdf)

    def get_by_id(self, pdf_id: str) -> PdfDocument | None:
        return self.repo.get_by_id(pdf_id)

    def get_all(self, skip: int = 0, limit: int = 100) -> PdfListResponse:
        items = self.repo.get_all(skip=skip, limit=limit)
        total = self.repo.count()
        return PdfListResponse(
            items=[PdfResponse.model_validate(p) for p in items],
            total=total,
        )

    def get_file_content(self, pdf: PdfDocument) -> bytes | None:
        """Read the PDF file from disk."""
        # storage_filename is "{uuid}.pdf", get_pdf_path expects the UUID
        file_uuid = pdf.storage_filename.replace(".pdf", "")
        path = get_pdf_path(file_uuid)
        return path.read_bytes() if path else None

    def delete(self, pdf_id: str) -> bool:
        """Delete a PDF from DB and disk. Returns True if deleted."""
        pdf = self.repo.get_by_id(pdf_id)
        if not pdf:
            return False
        self.repo.delete(pdf)
        delete_pdf(pdf.id)
        return True