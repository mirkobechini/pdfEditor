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


# ---------------------------------------------------------------------------
# Undo/Redo snapshot storage
# ---------------------------------------------------------------------------

MAX_SNAPSHOTS = 10


def get_snapshot_dir(pdf_id: str) -> Path:
    """Return the snapshot directory for a given PDF ID, creating it if needed."""
    snap_dir = get_storage_path().parent / "snapshots" / pdf_id
    snap_dir.mkdir(parents=True, exist_ok=True)
    return snap_dir


def save_snapshot(pdf_id: str, content: bytes) -> None:
    """Save a snapshot of the PDF before a modification. Keeps at most MAX_SNAPSHOTS."""
    snap_dir = get_snapshot_dir(pdf_id)
    timestamp = int(uuid.uuid4().time_low)  # monotonic-ish timestamp
    (snap_dir / f"{timestamp}.pdf").write_bytes(content)

    # Prune old snapshots
    files = sorted(snap_dir.glob("*.pdf"), key=lambda f: f.stat().st_mtime)
    while len(files) > MAX_SNAPSHOTS:
        files[0].unlink()
        files = files[1:]


def get_latest_snapshot(pdf_id: str) -> bytes | None:
    """Return the most recent snapshot content, or None."""
    snap_dir = get_snapshot_dir(pdf_id)
    files = sorted(snap_dir.glob("*.pdf"), key=lambda f: f.stat().st_mtime, reverse=True)
    if not files:
        return None
    return files[0].read_bytes()


def pop_latest_snapshot(pdf_id: str) -> bytes | None:
    """Return the most recent snapshot and delete it from disk. Returns None if no snapshots."""
    snap_dir = get_snapshot_dir(pdf_id)
    files = sorted(snap_dir.glob("*.pdf"), key=lambda f: f.stat().st_mtime, reverse=True)
    if not files:
        return None
    content = files[0].read_bytes()
    files[0].unlink()
    return content


def clear_snapshots(pdf_id: str) -> None:
    """Delete all snapshots for a given PDF ID."""
    snap_dir = get_snapshot_dir(pdf_id)
    for f in snap_dir.glob("*.pdf"):
        f.unlink()