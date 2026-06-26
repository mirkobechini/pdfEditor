import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.sqlite import TEXT

from app.core.database import Base


class PdfDocument(Base):
    __tablename__ = "pdf_documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)
    storage_filename = Column(String(255), nullable=False)  # UUID-based filename
    file_size = Column(Integer, nullable=False)  # in bytes
    page_count = Column(Integer, nullable=False, default=0)
    title = Column(String(255), nullable=True)
    author = Column(String(255), nullable=True)

    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<PdfDocument(id={self.id}, filename={self.original_filename})>"