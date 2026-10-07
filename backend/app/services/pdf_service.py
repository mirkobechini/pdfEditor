"""PdfService — business logic for PDF operations.

This module is intentionally thin: the concrete ``PdfService`` class composes
several mixins (defined in sibling modules under ``app/services/``) via
multiple inheritance. The behaviour is identical to the previous monolithic
definition; splitting the ~1100-line class keeps each file focused and under
the project's 400-line limit.

    from app.services.pdf_service import PdfService  # unchanged, works everywhere
"""
# Re-export the storage-level ``get_file_content`` so callers (and tests) can
# still monkeypatch ``app.services.pdf_service.get_file_content`` as before.
from app.core.storage import get_file_content  # noqa: F401

from app.services.pdf_service_utils import (
    _NoChange,
    _PASSWORD_CACHE_TTL,
    _cache_password,
    _clear_password_cache,
    _get_cached_password,
)
from app.services.pdf_service_core import PdfServiceCoreMixin
from app.services.pdf_service_upload import PdfServiceUploadMixin
from app.services.pdf_service_edit import PdfServiceEditMixin
from app.services.pdf_service_metadata import PdfServiceMetadataMixin
from app.services.pdf_service_password import PdfServicePasswordMixin
from app.services.pdf_service_mutate import PdfServiceMutateMixin


class PdfService(
    PdfServiceCoreMixin,
    PdfServiceUploadMixin,
    PdfServiceEditMixin,
    PdfServiceMetadataMixin,
    PdfServicePasswordMixin,
    PdfServiceMutateMixin,
):
    """Business logic for PDF operations."""

    # All behaviour lives in the mixed-in classes above; this class exists
    # solely to give callers a single, stable ``PdfService`` entry point.
    pass