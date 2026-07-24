import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String

from app.core.database import Base


class SyncStatus(Base):
    """Tracks the last sync timestamp per user for cloud sync."""
    __tablename__ = "sync_status"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True, unique=True)
    last_sync_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
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
        return f"<SyncStatus(user_id={self.user_id}, last_sync_at={self.last_sync_at})>"