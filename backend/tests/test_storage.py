"""Tests for storage.py — local filesystem operations."""

import uuid

import pytest

from app.core.storage import (
    _validate_uuid,
    clear_snapshots,
    delete_pdf,
    get_file_content,
    get_latest_snapshot,
    get_pdf_path,
    pop_latest_snapshot,
    save_pdf,
    save_snapshot,
    validate_pdf,
)


class TestStorageOperations:
    """Test local filesystem storage operations."""

    @pytest.fixture(autouse=True)
    def _force_local_storage(self, monkeypatch):
        """Ensure tests use local filesystem, not S3."""
        monkeypatch.setattr("app.core.storage.settings.STORAGE_BACKEND", "local")

    def test_save_and_get_pdf(self):
        """save_pdf should store bytes and get_pdf_path should find it."""
        content = b"%PDF-1.4 test content"
        file_uuid = save_pdf(content)
        path = get_pdf_path(file_uuid)
        assert path is not None
        assert path.exists()
        assert path.read_bytes() == content

    def test_get_file_content_returns_bytes(self):
        """get_file_content should return stored bytes."""
        content = b"%PDF-1.4 test content"
        file_uuid = save_pdf(content)
        retrieved = get_file_content(file_uuid)
        assert retrieved == content

    def test_get_file_content_not_found(self):
        """get_file_content should return None for missing files."""
        result = get_file_content("nonexistent-uuid")
        assert result is None

    def test_delete_pdf_removes_file(self):
        """delete_pdf should remove the file and return True."""
        content = b"%PDF-1.4 test content"
        file_uuid = save_pdf(content)
        assert delete_pdf(file_uuid) is True
        # File should be gone
        path = get_pdf_path(file_uuid)
        assert path is None

    def test_delete_pdf_not_found(self):
        """delete_pdf should return False for non-existent files."""
        assert delete_pdf(str(uuid.uuid4())) is False


class TestSnapshotOperations:
    """Test snapshot save/get/pop/clear operations."""

    @pytest.fixture(autouse=True)
    def _force_local_storage(self, monkeypatch):
        """Ensure tests use local filesystem, not S3."""
        monkeypatch.setattr("app.core.storage.settings.STORAGE_BACKEND", "local")

    def test_save_and_get_latest_snapshot(self):
        """save_snapshot should store and get_latest_snapshot should retrieve."""
        pdf_id = str(uuid.uuid4())
        save_snapshot(pdf_id, b"snapshot content")
        content = get_latest_snapshot(pdf_id)
        assert content == b"snapshot content"

    def test_get_latest_snapshot_no_snapshots(self):
        """get_latest_snapshot should return None when no snapshots exist."""
        pdf_id = str(uuid.uuid4())
        content = get_latest_snapshot(pdf_id)
        assert content is None

    def test_pop_latest_snapshot_returns_and_removes(self):
        """pop_latest_snapshot should return content and delete the snapshot."""
        pdf_id = str(uuid.uuid4())
        save_snapshot(pdf_id, b"pop test content")
        content = pop_latest_snapshot(pdf_id)
        assert content == b"pop test content"
        # Should now be empty
        assert get_latest_snapshot(pdf_id) is None

    def test_pop_latest_snapshot_no_snapshots(self):
        """pop_latest_snapshot should return None when no snapshots exist."""
        pdf_id = str(uuid.uuid4())
        content = pop_latest_snapshot(pdf_id)
        assert content is None

    def test_clear_snapshots_removes_all(self):
        """clear_snapshots should remove all snapshots for a PDF."""
        pdf_id = str(uuid.uuid4())
        save_snapshot(pdf_id, b"snap 1")
        save_snapshot(pdf_id, b"snap 2")
        clear_snapshots(pdf_id)
        assert get_latest_snapshot(pdf_id) is None

    def test_multiple_snapshots_ordering(self):
        """Multiple snapshots should be ordered by time."""
        pdf_id = str(uuid.uuid4())
        save_snapshot(pdf_id, b"first")
        import time
        time.sleep(0.05)
        save_snapshot(pdf_id, b"second")
        content = get_latest_snapshot(pdf_id)
        assert content == b"second"

    def test_max_snapshots_pruning(self):
        """save_snapshot should prune old snapshots beyond MAX_SNAPSHOTS."""
        pdf_id = str(uuid.uuid4())
        from app.core.config import settings
        max_snaps = settings.MAX_SNAPSHOTS
        for i in range(max_snaps + 5):
            import time
            time.sleep(0.05)
            save_snapshot(pdf_id, f"snap {i}".encode())
        content = get_latest_snapshot(pdf_id)
        assert content is not None
        assert content == f"snap {max_snaps + 4}".encode()


class TestValidateUuid:
    """Test UUID validation."""

    def test_valid_uuid_passes(self):
        """Valid UUID should pass through."""
        valid = str(uuid.uuid4())
        assert _validate_uuid(valid) == valid

    def test_invalid_uuid_raises(self):
        """Invalid UUID should raise ValueError."""
        with pytest.raises(ValueError):
            _validate_uuid("not-a-uuid")

    def test_path_traversal_raises(self):
        """Path traversal attempts should raise ValueError."""
        with pytest.raises(ValueError):
            _validate_uuid("../../../etc/passwd")


class TestS3Paths:
    """Test S3 storage paths (delegation to s3_storage)."""

    @pytest.fixture(autouse=True)
    def _force_s3_storage(self, monkeypatch):
        monkeypatch.setattr("app.core.storage.settings.STORAGE_BACKEND", "s3")
        monkeypatch.setattr("app.core.storage.settings.S3_BUCKET", "test-bucket")

    def test_save_pdf_s3(self, monkeypatch):
        """save_pdf should delegate to s3_upload when S3 is enabled."""
        import app.core.s3_storage as s3
        monkeypatch.setattr(s3, "s3_upload", lambda c: "s3-uuid")
        result = save_pdf(b"%PDF content")
        assert result == "s3-uuid"

    def test_get_pdf_path_s3_returns_none(self):
        """get_pdf_path should return None when S3 is enabled."""
        result = get_pdf_path("any-uuid")
        assert result is None

    def test_get_file_content_s3(self, monkeypatch):
        """get_file_content should delegate to s3_download when S3 is enabled."""
        import app.core.s3_storage as s3
        monkeypatch.setattr(s3, "s3_download", lambda u: b"s3 content")
        result = get_file_content("any-uuid")
        assert result == b"s3 content"

    def test_delete_pdf_s3(self, monkeypatch):
        """delete_pdf should delegate to s3_delete when S3 is enabled."""
        import app.core.s3_storage as s3
        monkeypatch.setattr(s3, "s3_delete", lambda u: True)
        result = delete_pdf("any-uuid")
        assert result is True

    def test_save_snapshot_s3(self, monkeypatch):
        """save_snapshot should delegate to s3_snapshot_save when S3 is enabled."""
        import app.core.s3_storage as s3
        called = []
        monkeypatch.setattr(s3, "s3_snapshot_save", lambda pid, c: called.append((pid, c)))
        save_snapshot("pdf-1", b"snap")
        assert len(called) == 1

    def test_get_latest_snapshot_s3(self, monkeypatch):
        """get_latest_snapshot should delegate to s3_snapshot_latest."""
        import app.core.s3_storage as s3
        monkeypatch.setattr(s3, "s3_snapshot_latest", lambda u: b"s3 snap")
        result = get_latest_snapshot("pdf-1")
        assert result == b"s3 snap"

    def test_pop_latest_snapshot_s3(self, monkeypatch):
        """pop_latest_snapshot should delegate to s3_snapshot_pop."""
        import app.core.s3_storage as s3
        monkeypatch.setattr(s3, "s3_snapshot_pop", lambda u: b"popped")
        result = pop_latest_snapshot("pdf-1")
        assert result == b"popped"

    def test_clear_snapshots_s3(self, monkeypatch):
        """clear_snapshots should delegate to s3_snapshot_clear."""
        import app.core.s3_storage as s3
        called = []
        monkeypatch.setattr(s3, "s3_snapshot_clear", lambda u: called.append(u))
        clear_snapshots("pdf-1")
        assert len(called) == 1


class TestValidatePdf:
    """Test PDF validation."""

    def test_valid_pdf_content(self):
        """validate_pdf should return True for valid PDF content."""
        import fitz
        doc = fitz.open()
        doc.new_page()
        valid = doc.tobytes()
        doc.close()
        assert validate_pdf(valid) is True

    def test_invalid_pdf_header(self):
        """validate_pdf should return False for content without PDF header."""
        invalid = b"Not a PDF at all"
        assert validate_pdf(invalid) is False

    def test_empty_content(self):
        """validate_pdf should return False for empty bytes."""
        assert validate_pdf(b"") is False
    def test_corrupt_pdf_content(self):
        """validate_pdf should return False for corrupt PDF with valid header."""
        assert validate_pdf(b"%PDF-1.4 corrupt\x00\x00\x00") is False