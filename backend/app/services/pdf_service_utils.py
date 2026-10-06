"""Shared helpers for the PdfService mixins (extracted from pdf_service.py).

Holds the DB-backed password cache and the ``_NoChange`` sentinel used by
``_mutate_pdf_document``. Kept in a dedicated module so the mixin files and
``pdf_service.py`` can share them without circular imports.
"""
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from app.core.password_cipher import encrypt_password, decrypt_password
from app.models.password_cache import PasswordCache


# DB-backed password cache for password-protected PDFs (supports multi-worker)
# Entries auto-expire after 30 minutes (cleaned on read/write)
_PASSWORD_CACHE_TTL = 1800  # 30 minutes in seconds


@dataclass
class _NoChange:
    """Sentinel returned by a `_mutate_pdf_document` callback to signal that
    the document was left unchanged and shouldn't be re-saved (e.g. OCR on a
    PDF that already has a text layer)."""

    value: Any


def _get_cached_password(pdf_id: str) -> str | None:
    """Return cached password from DB if not expired, cleaning up expired entries."""
    from app.core.database import engine
    from sqlalchemy.orm import Session
    db = Session(bind=engine)
    try:
        entry = db.query(PasswordCache).filter(PasswordCache.pdf_id == pdf_id).first()
        if entry:
            # Handle both naive and aware datetimes (SQLite stores naive)
            created = entry.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            age = (datetime.now(timezone.utc) - created).total_seconds()
            if age < _PASSWORD_CACHE_TTL:
                return decrypt_password(entry.password)
            db.delete(entry)
            db.commit()
        return None
    finally:
        db.close()


def _cache_password(pdf_id: str, password: str) -> None:
    """Cache a password in DB, replacing any existing entry."""
    from app.core.database import engine
    from sqlalchemy.orm import Session
    db = Session(bind=engine)
    try:
        # Cleanup expired entries on every cache write (lazy cleanup)
        cutoff = datetime.now(timezone.utc).timestamp() - _PASSWORD_CACHE_TTL
        cutoff_dt = datetime.fromtimestamp(cutoff, tz=timezone.utc)
        db.query(PasswordCache).filter(PasswordCache.created_at < cutoff_dt).delete()
        db.commit()

        # Upsert: delete existing then insert new
        existing = db.query(PasswordCache).filter(PasswordCache.pdf_id == pdf_id).first()
        if existing:
            db.delete(existing)
            db.commit()

        entry = PasswordCache(pdf_id=pdf_id, password=encrypt_password(password))
        db.add(entry)
        db.commit()
    finally:
        db.close()


def _clear_password_cache() -> None:
    """Clear all cached passwords (called on shutdown for security)."""
    from app.core.database import engine
    from sqlalchemy.orm import Session
    db = Session(bind=engine)
    try:
        db.query(PasswordCache).delete()
        db.commit()
    finally:
        db.close()