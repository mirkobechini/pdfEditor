import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.pdf import PdfDocument
from app.repositories.pdf_repo import PdfRepository
from app.repositories.sync_repo import SyncRepository

logger = logging.getLogger("pdfeditor")


class SyncService:
    """Business logic for cloud sync."""

    def __init__(self, db: Session):
        self.sync_repo = SyncRepository(db)
        self.pdf_repo = PdfRepository(db)

    def get_status(self, user_id: str) -> dict:
        """Return the last sync timestamp for the user."""
        status = self.sync_repo.get_by_user(user_id)
        return {
            "last_sync_at": status.last_sync_at.isoformat() if status else None,
            "has_synced": status is not None,
        }

    def push(self, user_id: str, pdfs: list[dict]) -> dict:
        """Push local PDF records to the cloud.
        Uses last-write-wins: if the local record is newer, it overwrites.
        """
        now = datetime.now(timezone.utc)
        pushed = 0
        skipped = 0
        errors = []

        for pdf_data in pdfs:
            try:
                local_updated = datetime.fromisoformat(pdf_data["updated_at"])
                existing = self.pdf_repo.get_by_id_and_user(pdf_data["id"], user_id)

                if existing:
                    # Last-write-wins: compare timestamps
                    existing_updated = existing.updated_at
                    if existing_updated.tzinfo is not None and local_updated.tzinfo is None:
                        local_updated = local_updated.replace(tzinfo=timezone.utc)
                    elif existing_updated.tzinfo is None and local_updated.tzinfo is not None:
                        existing_updated = existing_updated.replace(tzinfo=timezone.utc)

                    if local_updated > existing_updated:
                        # Update existing
                        for field in ("original_filename", "title", "author", "page_count", "file_size", "is_password_protected"):
                            if field in pdf_data:
                                setattr(existing, field, pdf_data[field])
                        existing.updated_at = now
                        self.pdf_repo.update(existing)
                        pushed += 1
                    else:
                        skipped += 1
                else:
                    # Create new PDF record
                    pdf = PdfDocument(
                        id=pdf_data["id"],
                        user_id=user_id,
                        original_filename=pdf_data.get("original_filename", "document.pdf"),
                        storage_filename=pdf_data.get("storage_filename", pdf_data["id"]),
                        file_size=pdf_data.get("file_size", 0),
                        page_count=pdf_data.get("page_count", 0),
                        title=pdf_data.get("title"),
                        author=pdf_data.get("author"),
                        is_password_protected=pdf_data.get("is_password_protected", False),
                    )
                    self.pdf_repo.create(pdf)
                    pushed += 1
            except Exception as e:
                logger.error("Sync push error for PDF %s: %s", pdf_data.get("id"), e)
                errors.append({"id": pdf_data.get("id"), "error": str(e)})

        # Update sync timestamp
        self.sync_repo.upsert_last_sync(user_id, now)

        return {
            "pushed": pushed,
            "skipped": skipped,
            "errors": errors,
            "synced_at": now.isoformat(),
        }

    def pull(self, user_id: str, since: datetime | None = None) -> dict:
        """Pull PDF records from the cloud that were updated after `since`."""
        query = PdfDocument.__table__.select().where(PdfDocument.user_id == user_id)
        if since:
            query = query.where(PdfDocument.updated_at > since)

        results = self.pdf_repo.db.execute(query).fetchall()
        pdfs = []
        for row in results:
            pdfs.append({
                "id": row.id,
                "user_id": row.user_id,
                "original_filename": row.original_filename,
                "storage_filename": row.storage_filename,
                "file_size": row.file_size,
                "page_count": row.page_count,
                "title": row.title,
                "author": row.author,
                "is_password_protected": row.is_password_protected,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            })

        # Update sync timestamp
        now = datetime.now(timezone.utc)
        self.sync_repo.upsert_last_sync(user_id, now)

        return {
            "pdfs": pdfs,
            "count": len(pdfs),
            "synced_at": now.isoformat(),
        }