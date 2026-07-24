from datetime import datetime
from sqlalchemy.orm import Session

from app.models.sync import SyncStatus


class SyncRepository:
    """Repository for SyncStatus database operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_user(self, user_id: str) -> SyncStatus | None:
        return (
            self.db.query(SyncStatus)
            .filter(SyncStatus.user_id == user_id)
            .first()
        )

    def upsert_last_sync(self, user_id: str, sync_at: datetime) -> SyncStatus:
        """Update or create the last sync timestamp for a user."""
        existing = self.get_by_user(user_id)
        if existing:
            existing.last_sync_at = sync_at
            existing.updated_at = sync_at
            self.db.flush()
            self.db.refresh(existing)
            return existing
        status = SyncStatus(
            user_id=user_id,
            last_sync_at=sync_at,
        )
        self.db.add(status)
        self.db.flush()
        self.db.refresh(status)
        return status