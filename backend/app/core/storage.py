import uuid
from pathlib import Path

import fitz  # PyMuPDF

from app.core.config import settings


def get_storage_path() -> Path:
    path = Path(settings.UPLOAD_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


def validate_pdf(content: bytes) -> bool:
    """Validate that the content is a valid PDF using magic bytes + PyMuPDF."""
    # Check PDF magic bytes: %PDF
    if not content.startswith(b"%PDF"):
        return False
    # Try opening with PyMuPDF for deeper validation
    try:
        doc = fitz.open(stream=content, filetype="pdf")
        doc.close()
        return True
    except Exception:
        return False


def save_pdf(content: bytes) -> str:
    """Save a PDF file to storage and return the UUID filename."""
    storage_path = get_storage_path()
    file_uuid = str(uuid.uuid4())
    file_path = storage_path / f"{file_uuid}.pdf"
    file_path.write_bytes(content)
    return file_uuid


def get_pdf_path(file_uuid: str) -> Path | None:
    """Return the full path to a stored PDF or None if not found."""
    storage_path = get_storage_path()
    file_path = storage_path / f"{file_uuid}.pdf"
    return file_path if file_path.exists() else None


def delete_pdf(file_uuid: str) -> bool:
    """Delete a PDF file from storage. Returns True if deleted."""
    path = get_pdf_path(file_uuid)
    if path:
        path.unlink()
        return True
    return False