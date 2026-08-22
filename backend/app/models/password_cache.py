import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from app.core.database import Base


class PasswordCache(Base):
    """Persistent password cache for password-protected PDFs.

    Replaces the module-global _password_cache dict to support multi-worker setups.
    Entries auto-expire after 30 minutes (cleaned on read/write).
    """

    __tablename__ = "password_cache"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pdf_id = Column(String(36), ForeignKey("pdf_documents.id"), nullable=False, unique=True, index=True)
    password = Column(String(255), nullable=False)
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<PasswordCache(pdf_id={self.pdf_id})>"
