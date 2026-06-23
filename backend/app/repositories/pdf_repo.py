from sqlalchemy.orm import Session

from app.models.pdf import PdfDocument


class PdfRepository:
    """Repository for PdfDocument database operations."""

    def __init__(self, db: Session):
        self.db = db

    def create(self, pdf: PdfDocument) -> PdfDocument:
        self.db.add(pdf)
        self.db.flush()
        self.db.refresh(pdf)
        return pdf

    def get_by_id(self, pdf_id: str) -> PdfDocument | None:
        return self.db.query(PdfDocument).filter(PdfDocument.id == pdf_id).first()

    def get_all(self, skip: int = 0, limit: int = 100) -> list[PdfDocument]:
        return (
            self.db.query(PdfDocument)
            .order_by(PdfDocument.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count(self) -> int:
        return self.db.query(PdfDocument).count()

    def delete(self, pdf: PdfDocument) -> None:
        self.db.delete(pdf)
        self.db.flush()