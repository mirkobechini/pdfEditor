"""Tests for s3_storage.py — S3-compatible backend with mocked boto3."""

import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.core.s3_storage import (
    _s3_key,
    _s3_snapshot_key,
    s3_delete,
    s3_download,
    s3_snapshot_clear,
    s3_snapshot_latest,
    s3_snapshot_pop,
    s3_snapshot_save,
    s3_upload,
)


@pytest.fixture
def mock_s3():
    """Return a mocked boto3 S3 client."""
    with patch("app.core.s3_storage.boto3.client") as mock:
        mock_client = MagicMock()
        mock.return_value = mock_client
        yield mock_client


class TestS3KeyHelpers:
    """Test S3 key generation helpers."""

    def test_s3_key_format(self):
        """_s3_key should produce pdfs/{uuid}.pdf."""
        key = _s3_key("abc-123")
        assert key == "pdfs/abc-123.pdf"

    def test_s3_snapshot_key_format(self):
        """_s3_snapshot_key should produce snapshots/{uuid}/{id}.pdf."""
        pdf_id = str(uuid.uuid4())
        snap_id = "12345"
        key = _s3_snapshot_key(pdf_id, snap_id)
        assert key.startswith(f"snapshots/{uuid.UUID(pdf_id)}/")
        assert key.endswith(".pdf")


class TestS3Upload:
    """Test s3_upload function."""

    def test_upload_returns_uuid(self, mock_s3):
        """s3_upload should return a UUID string."""
        file_uuid = s3_upload(b"%PDF test content")
        assert file_uuid is not None
        assert len(file_uuid) > 0
        # Verify put_object was called
        mock_s3.put_object.assert_called_once()

    def test_upload_content_type(self, mock_s3):
        """s3_upload should set ContentType to application/pdf."""
        s3_upload(b"%PDF test content")
        kwargs = mock_s3.put_object.call_args[1]
        assert kwargs["ContentType"] == "application/pdf"
        assert kwargs["Body"] == b"%PDF test content"


class TestS3Download:
    """Test s3_download function."""

    def test_download_success(self, mock_s3):
        """s3_download should return content when object exists."""
        mock_s3.get_object.return_value = {"Body": MagicMock(read=MagicMock(return_value=b"pdf content"))}
        result = s3_download("some-uuid")
        assert result == b"pdf content"
        mock_s3.get_object.assert_called_once()

    def test_download_not_found(self, mock_s3):
        """s3_download should return None when NoSuchKey."""
        from botocore.exceptions import ClientError
        mock_s3.get_object.side_effect = ClientError(
            {"Error": {"Code": "NoSuchKey"}}, "get_object"
        )
        result = s3_download("missing-uuid")
        assert result is None


class TestS3Delete:
    """Test s3_delete function."""

    def test_delete_success(self, mock_s3):
        """s3_delete should return True on success."""
        assert s3_delete("some-uuid") is True
        mock_s3.delete_object.assert_called_once()

    def test_delete_failure(self, mock_s3):
        """s3_delete should return False on exception."""
        mock_s3.delete_object.side_effect = Exception("S3 error")
        assert s3_delete("some-uuid") is False


class TestS3Snapshots:
    """Test S3 snapshot operations."""

    @pytest.fixture(autouse=True)
    def _setup(self, mock_s3):
        self.pdf_id = str(uuid.uuid4())

    def test_snapshot_save(self, mock_s3):
        """s3_snapshot_save should call put_object."""
        s3_snapshot_save(self.pdf_id, b"snap content")
        mock_s3.put_object.assert_called_once()

    def test_snapshot_latest_no_snapshots(self, mock_s3):
        """s3_snapshot_latest should return None when no snapshots."""
        mock_s3.list_objects_v2.return_value = {}
        result = s3_snapshot_latest(self.pdf_id)
        assert result is None

    def test_snapshot_latest_found(self, mock_s3):
        """s3_snapshot_latest should return latest snapshot."""
        mock_s3.list_objects_v2.return_value = {
            "Contents": [
                {"Key": "snap1.pdf", "LastModified": "2026-01-01T00:00:00"},
                {"Key": "snap2.pdf", "LastModified": "2026-01-02T00:00:00"},
            ]
        }
        mock_s3.get_object.return_value = {"Body": MagicMock(read=MagicMock(return_value=b"latest"))}
        result = s3_snapshot_latest(self.pdf_id)
        assert result == b"latest"

    def test_snapshot_pop_returns_and_deletes(self, mock_s3):
        """s3_snapshot_pop should return content and delete the latest."""
        mock_s3.list_objects_v2.return_value = {
            "Contents": [
                {"Key": "snap1.pdf", "LastModified": "2026-01-01T00:00:00"},
            ]
        }
        mock_s3.get_object.return_value = {"Body": MagicMock(read=MagicMock(return_value=b"popped"))}
        result = s3_snapshot_pop(self.pdf_id)
        assert result == b"popped"
        mock_s3.delete_object.assert_called_once()

    def test_snapshot_pop_no_snapshots(self, mock_s3):
        """s3_snapshot_pop should return None when no snapshots."""
        mock_s3.list_objects_v2.return_value = {}
        result = s3_snapshot_pop(self.pdf_id)
        assert result is None

    def test_snapshot_clear(self, mock_s3):
        """s3_snapshot_clear should delete all snapshots."""
        mock_s3.list_objects_v2.return_value = {
            "Contents": [
                {"Key": "snap1.pdf", "LastModified": "2026-01-01T00:00:00"},
                {"Key": "snap2.pdf", "LastModified": "2026-01-02T00:00:00"},
            ]
        }
        s3_snapshot_clear(self.pdf_id)
        assert mock_s3.delete_object.call_count == 2

    def test_snapshot_clear_no_snapshots(self, mock_s3):
        """s3_snapshot_clear should do nothing when no snapshots."""
        mock_s3.list_objects_v2.return_value = {}
        s3_snapshot_clear(self.pdf_id)
        mock_s3.delete_object.assert_not_called()

    def test_snapshot_save_prunes_old(self, mock_s3, monkeypatch):
        """s3_snapshot_save should prune old snapshots when exceeding MAX_SNAPSHOTS."""
        from app.core.config import settings
        monkeypatch.setattr(settings, "MAX_SNAPSHOTS", 1)
        mock_s3.list_objects_v2.return_value = {
            "Contents": [
                {"Key": "old.pdf", "LastModified": "2026-01-01T00:00:00"},
                {"Key": "newer.pdf", "LastModified": "2026-01-02T00:00:00"},
            ]
        }
        s3_snapshot_save(self.pdf_id, b"content")
        # Should delete the oldest (1 of 2, since MAX_SNAPSHOTS=1)
        mock_s3.delete_object.assert_called_once()

    def test_snapshot_pop_no_snapshots(self, mock_s3):
        """s3_snapshot_pop should return None when no snapshots."""
        mock_s3.list_objects_v2.return_value = {}
        result = s3_snapshot_pop(self.pdf_id)
        assert result is None

    def test_snapshot_clear(self, mock_s3):
        """s3_snapshot_clear should delete all snapshots."""
        mock_s3.list_objects_v2.return_value = {
            "Contents": [
                {"Key": "snap1.pdf"},
                {"Key": "snap2.pdf"},
            ]
        }
        s3_snapshot_clear(self.pdf_id)
        assert mock_s3.delete_object.call_count == 2

    def test_snapshot_clear_empty(self, mock_s3):
        """s3_snapshot_clear should do nothing when no snapshots."""
        mock_s3.list_objects_v2.return_value = {}
        s3_snapshot_clear(self.pdf_id)
        mock_s3.delete_object.assert_not_called()