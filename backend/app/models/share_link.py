import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String

from app.core.database import Base


class ShareLink(Base):
    """A shareable link for a PDF document.

    The token is a random UUID that acts as the public access key.
    Optional password (hashed) and expiry date can protect the link.
    """
    __tablename__ = "share_links"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pdf_id = Column(String(36), ForeignKey("pdf_documents.id"), nullable=False, index=True)
    token = Column(String(64), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<ShareLink(id={self.id}, pdf_id={self.pdf_id}, token={self.token})>"