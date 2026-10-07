"""Core/read mixin for PdfService (extracted from pdf_service.py).

Foundational methods shared by all other mixins: DB setup, ownership lookup,
snapshot/read-with-password helpers, file/decrypted content access, delete and
the basic list/get operations.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.storage import (
    delete_pdf,
    pop_latest_snapshot,
    save_snapshot,
)
from app.models.pdf import PdfDocument
from app.models.password_cache import PasswordCache
from app.models.share_link import ShareLink
from app.repositories.pdf_repo import PdfRepository
from app.schemas.pdf import PdfListResponse, PdfResponse
from app.services.pdf_service_utils import _get_cached_password


class PdfServiceCoreMixin:
    """Low-level PdfService plumbing (MRO base): repo, snapshot, read."""

    def __init__(self, db: Session):
        self.repo = PdfRepository(db)

    def _get_user_pdf(self, pdf_id: str, user_id: str) -> PdfDocument:
        """Get a PDF owned by the given user, or raise ValueError."""
        pdf = self.repo.get_by_id_and_user(pdf_id, user_id)
        if not pdf:
            raise ValueError(f"PDF {pdf_id} not found")
        return pdf

    def _create_snapshot(self, pdf_id: str, user_id: str) -> None:
        """Save a snapshot of the PDF before a modification."""
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)
        content = self._read_file_with_password(pdf_id, user_id)
        if content:
            save_snapshot(pdf_id, content)

    def _read_file_with_password(self, pdf_id: str, user_id: str) -> bytes:
        """Read file content, unlocking with cached password if needed."""
        pdf = self._get_user_pdf(pdf_id, user_id)
        content = self.get_file_content(pdf)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")
        if pdf.is_password_protected:
            if not _get_cached_password(pdf_id):
                raise ValueError("PDF is password protected. Please unlock it first.")
            import fitz
            doc = fitz.open(stream=content, filetype="pdf")
            if doc.needs_pass:
                doc.authenticate(_get_cached_password(pdf_id))
                content = doc.tobytes()
            doc.close()
        return content

    def get_by_id(self, pdf_id: str) -> PdfDocument | None:
        return self.repo.get_by_id(pdf_id)

    def get_all(self, user_id: str, skip: int = 0, limit: int = 100) -> PdfListResponse:
        items = self.repo.get_all_by_user(user_id, skip=skip, limit=limit)
        total = self.repo.count_by_user(user_id)
        return PdfListResponse(
            items=[PdfResponse.model_validate(p) for p in items],
            total=total,
        )

    def get_file_content(self, pdf: PdfDocument) -> bytes | None:
        """Read the PDF file from storage (local or S3)."""
        # Resolve through ``app.services.pdf_service`` so callers/tests can
        # monkeypatch ``pdf_service.get_file_content`` (the storage-level fn),
        # matching the pre-refactor behaviour.
        from app.services.pdf_service import get_file_content as _storage_get
        # storage_filename is "{uuid}.pdf" — storage API expects UUID only
        file_uuid = pdf.storage_filename.replace(".pdf", "")
        return _storage_get(file_uuid)

    def get_decrypted_content(self, pdf: PdfDocument) -> bytes:
        """Read and decrypt a password-protected PDF using cached password.
        Raises ValueError if no cached password is available."""
        content = self.get_file_content(pdf)
        if not content:
            raise ValueError(f"PDF {pdf.id} file not found on disk")
        password = _get_cached_password(pdf.id)
        if not password:
            raise ValueError("PDF is password protected. Please unlock it first.")
        import fitz
        doc = fitz.open(stream=content, filetype="pdf")
        if doc.needs_pass:
            doc.authenticate(password)
        result = doc.tobytes()
        doc.close()
        return result

    def delete(self, pdf_id: str, user_id: str) -> bool:
        """Delete a PDF from DB and disk. Returns True if deleted."""
        try:
            pdf = self._get_user_pdf(pdf_id, user_id)
        except ValueError:
            return False
        # Delete child rows first: ShareLink/PasswordCache have a pdf_id
        # ForeignKey with no ondelete=CASCADE (this project has no Alembic —
        # the auto-migration only adds tables/columns, it can't alter an
        # existing FK constraint). SQLite (tests, desktop sidecar) doesn't
        # enforce FKs by default, so this was never caught locally, but
        # Postgres (production) does — deleting a PDF with an active share
        # link or a cached password would 500 with an IntegrityError.
        self.repo.db.query(ShareLink).filter(ShareLink.pdf_id == pdf_id).delete()
        self.repo.db.query(PasswordCache).filter(PasswordCache.pdf_id == pdf_id).delete()
        self.repo.delete(pdf)
        # storage_filename is "{uuid}.pdf" — extract UUID for delete_pdf
        file_uuid = pdf.storage_filename.replace(".pdf", "")
        delete_pdf(file_uuid)
        return True