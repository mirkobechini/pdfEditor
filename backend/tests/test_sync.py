"""Tests for sync_service.py, sync_repo.py, and sync API endpoint."""

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.database import SessionLocal, engine, Base
from app.models.sync import SyncStatus
from app.models.pdf import PdfDocument
from app.repositories.sync_repo import SyncRepository
from app.services.sync_service import SyncService


class TestSyncRepository:
    """Test SyncRepository database operations."""

    def test_get_by_user_nonexistent(self, db_session):
        repo = SyncRepository(db_session)
        result = repo.get_by_user("nonexistent-id")
        assert result is None

    def test_upsert_last_sync_creates(self, db_session):
        repo = SyncRepository(db_session)
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        result = repo.upsert_last_sync(user_id, now)
        assert result is not None
        assert result.user_id == user_id

    def test_upsert_last_sync_updates(self, db_session):
        repo = SyncRepository(db_session)
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        # Create
        first = repo.upsert_last_sync(user_id, now)
        assert first is not None
        first_ts = str(first.last_sync_at)

        # Update with newer timestamp
        later = datetime.now(timezone.utc)
        updated = repo.upsert_last_sync(user_id, later)
        assert updated is not None
        assert updated.user_id == user_id
        # SQLite stores naive datetime, so compare as strings
        assert str(updated.last_sync_at) >= first_ts


class TestSyncService:
    """Test SyncService business logic."""

    def test_get_status_no_sync(self, db_session):
        service = SyncService(db_session)
        user_id = str(uuid.uuid4())
        result = service.get_status(user_id)
        assert result["has_synced"] is False
        assert result["last_sync_at"] is None

    def test_get_status_after_sync(self, db_session):
        service = SyncService(db_session)
        user_id = str(uuid.uuid4())

        # Create a sync status
        repo = SyncRepository(db_session)
        repo.upsert_last_sync(user_id, datetime.now(timezone.utc))
        db_session.commit()

        result = service.get_status(user_id)
        assert result["has_synced"] is True
        assert result["last_sync_at"] is not None

    def test_push_new_pdf(self, db_session):
        service = SyncService(db_session)
        user_id = str(uuid.uuid4())
        pdf_id = str(uuid.uuid4())

        pdfs = [{
            "id": pdf_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "original_filename": "test.pdf",
            "file_size": 100,
            "page_count": 1,
        }]

        result = service.push(user_id, pdfs)
        assert result["pushed"] == 1
        assert result["skipped"] == 0
        assert len(result["errors"]) == 0

    def test_push_skips_older(self, db_session):
        service = SyncService(db_session)
        user_id = str(uuid.uuid4())
        pdf_id = str(uuid.uuid4())

        # First push — create
        pdfs = [{
            "id": pdf_id,
            "updated_at": "2024-01-01T00:00:00+00:00",
            "original_filename": "old.pdf",
            "file_size": 100,
            "page_count": 1,
        }]
        result = service.push(user_id, pdfs)
        assert result["pushed"] == 1

        # Second push with older timestamp — should skip (last-write-wins)
        pdfs_older = [{
            "id": pdf_id,
            "updated_at": "2023-01-01T00:00:00+00:00",
            "original_filename": "older.pdf",
            "file_size": 50,
            "page_count": 1,
        }]
        result = service.push(user_id, pdfs_older)
        assert result["skipped"] == 1

    def test_push_handles_error(self, db_session):
        service = SyncService(db_session)
        user_id = str(uuid.uuid4())

        # Missing required fields
        pdfs = [{"id": "bad-data"}]  # No updated_at
        result = service.push(user_id, pdfs)
        assert len(result["errors"]) == 1
        assert result["pushed"] == 0

    def test_pull_empty(self, db_session):
        service = SyncService(db_session)
        user_id = str(uuid.uuid4())
        result = service.pull(user_id)
        assert result["count"] == 0
        assert len(result["pdfs"]) == 0
        assert result["synced_at"] is not None

    def test_pull_with_since(self, db_session):
        service = SyncService(db_session)
        user_id = str(uuid.uuid4())

        # Create a PDF for this user
        pdf = PdfDocument(
            id=str(uuid.uuid4()),
            user_id=user_id,
            original_filename="test.pdf",
            storage_filename=str(uuid.uuid4()),
            file_size=100,
            page_count=1,
        )
        db_session.add(pdf)
        db_session.commit()

        # Pull with a since timestamp before creation
        since = datetime(2020, 1, 1, tzinfo=timezone.utc)
        result = service.pull(user_id, since)
        assert result["count"] == 1

        # Pull with a since timestamp after creation
        since_future = datetime(2099, 1, 1, tzinfo=timezone.utc)
        result = service.pull(user_id, since_future)
        assert result["count"] == 0


class TestSyncAPI:
    """Test sync API endpoints."""

    def test_sync_status_requires_auth(self, client: TestClient):
        resp = client.get("/sync/status")
        assert resp.status_code == 401

    def test_sync_push_requires_auth(self, client: TestClient):
        resp = client.post("/sync/push", json={"pdfs": []})
        assert resp.status_code == 401

    def test_sync_pull_requires_auth(self, client: TestClient):
        resp = client.get("/sync/pull")
        assert resp.status_code == 401