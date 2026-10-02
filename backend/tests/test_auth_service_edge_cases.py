"""Tests for edge cases across multiple modules."""

import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi import status
from sqlalchemy import create_engine, inspect

from app.core.config import settings
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.main import app as fastapi_app

class TestAuthServiceEdgeCases:
    """Test auth_service.py edge cases."""

    def test_login_inactive_user(self, client, db_session):
        """Login should fail for inactive user."""
        import uuid
        from app.core.security import get_password_hash
        user = User(
            id=str(uuid.uuid4()),
            email="inactive@test.com",
            hashed_password=get_password_hash("TestPass123"),
            full_name="Inactive User",
            is_active=False,
        )
        db_session.add(user)
        db_session.flush()

        from app.services.auth_service import AuthService
        service = AuthService(db_session)
        with pytest.raises(ValueError, match="Account is inactive"):
            service.login("inactive@test.com", "TestPass123")

    def test_get_current_user_inactive(self, client, db_session):
        """get_current_user should fail for inactive user."""
        import uuid
        from app.core.security import get_password_hash, create_access_token
        user = User(
            id=str(uuid.uuid4()),
            email="inactive_get@test.com",
            hashed_password=get_password_hash("TestPass123"),
            full_name="Inactive User",
            is_active=False,
        )
        db_session.add(user)
        db_session.flush()

        token = create_access_token(data={"sub": user.id})
        from app.services.auth_service import AuthService
        service = AuthService(db_session)
        with pytest.raises(ValueError, match="Account is inactive"):
            service.get_current_user(token)

    def test_get_current_user_not_found(self, db_session):
        """get_current_user should fail for non-existent user."""
        from app.core.security import create_access_token
        import uuid
        token = create_access_token(data={"sub": str(uuid.uuid4())})
        from app.services.auth_service import AuthService
        service = AuthService(db_session)
        with pytest.raises(ValueError, match="User not found"):
            service.get_current_user(token)

    def test_get_current_user_no_user_id(self, db_session):
        """get_current_user should fail if token has no sub."""
        from app.core.security import create_access_token
        token = create_access_token(data={"other": "value"})
        from app.services.auth_service import AuthService
        service = AuthService(db_session)
        with pytest.raises(ValueError, match="Invalid token payload"):
            service.get_current_user(token)

    def test_validate_password_strength_all_checks(self):
        """Each password strength check should raise ValueError."""
        from app.services.auth_service import _validate_password_strength

        with pytest.raises(ValueError, match="at least 8 characters"):
            _validate_password_strength("Ab1")
        with pytest.raises(ValueError, match="uppercase"):
            _validate_password_strength("abcdefgh1")
        with pytest.raises(ValueError, match="lowercase"):
            _validate_password_strength("ABCDEFG1")
        with pytest.raises(ValueError, match="number"):
            _validate_password_strength("Abcdefgh")
        # Valid password should not raise
        _validate_password_strength("ValidPass1")

    def test_reset_password_update_fails(self, db_session, monkeypatch):
        """reset_password should raise if update_password returns None."""
        import uuid
        from datetime import datetime, timedelta, timezone
        from app.core.security import get_password_hash

        user = User(
            id=str(uuid.uuid4()),
            email="reset_fail@test.com",
            hashed_password=get_password_hash("OldPass123"),
            full_name="Reset Fail",
            reset_token="valid-token",
            reset_token_expires=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db_session.add(user)
        db_session.flush()

        from app.services.auth_service import AuthService
        service = AuthService(db_session)

        # Mock update_password to return None
        from unittest.mock import patch
        with patch.object(service.repo, "update_password", return_value=None):
            with pytest.raises(ValueError, match="Failed to update password"):
                service.reset_password("valid-token", "NewPass123")

    def test_google_login_inactive_user(self, db_session):
        """google_login should fail for inactive user.
        Mocks google-auth verify_oauth2_token to return a known payload.
        """
        import uuid
        from unittest.mock import patch
        from app.core.security import get_password_hash

        user = User(
            id=str(uuid.uuid4()),
            email="google_inactive@test.com",
            hashed_password=get_password_hash("dummy"),
            full_name="Google Inactive",
            google_id="google-123",
            is_active=False,
        )
        db_session.add(user)
        db_session.flush()

        with patch("google.oauth2.id_token.verify_oauth2_token", return_value={
            "email": "google_inactive@test.com",
            "sub": "google-123",
        }):
            from app.services.auth_service import AuthService
            service = AuthService(db_session)

            with pytest.raises(ValueError, match="Account is inactive"):
                service.google_login("fake-id-token")

    def test_password_cache_expired(self, db_session):
        """Test that expired password cache entries are cleaned up."""
        from app.services.pdf_service import _cache_password, _get_cached_password, _clear_password_cache
        from app.models.password_cache import PasswordCache
        from datetime import datetime, timezone, timedelta
        _clear_password_cache()

        # Insert an expired entry directly via DB
        expired = PasswordCache(pdf_id="expired-pdf", password="oldpass")
        expired.created_at = datetime.now(timezone.utc) - timedelta(minutes=31)
        db_session.add(expired)
        db_session.commit()

        # Getting expired password should return None and clean up
        result = _get_cached_password("expired-pdf")
        assert result is None
        assert db_session.query(PasswordCache).filter(PasswordCache.pdf_id == "expired-pdf").first() is None

        _clear_password_cache()

    def test_delete_pdf_with_cached_password(self, client, free_headers, db_session):
        """Regression: deleting a PDF with a cached password must not fail.
        PasswordCache.pdf_id has no ondelete=CASCADE (same gap as
        ShareLink — see test_share.py's test_delete_pdf_with_active_share_link)
        — Postgres (production) would 500 with an IntegrityError unless the
        service explicitly deletes the PasswordCache row first."""
        import fitz
        from app.models.password_cache import PasswordCache

        doc = fitz.open()
        doc.new_page(width=200, height=200)
        content = doc.tobytes()
        doc.close()

        resp = client.post(
            "/pdfs/upload",
            headers=free_headers,
            files={"file": ("cached.pdf", content, "application/pdf")},
        )
        pdf_id = resp.json()["id"]

        db_session.add(PasswordCache(pdf_id=pdf_id, password="cached-secret"))
        db_session.commit()

        resp = client.delete(f"/pdfs/{pdf_id}", headers=free_headers)
        assert resp.status_code == 204

        assert db_session.query(PasswordCache).filter(PasswordCache.pdf_id == pdf_id).first() is None

    def test_password_cache_lazy_cleanup(self, db_session):
        """Test lazy cleanup on cache write."""
        from app.services.pdf_service import _cache_password, _get_cached_password, _clear_password_cache
        from app.models.password_cache import PasswordCache
        from datetime import datetime, timezone, timedelta
        _clear_password_cache()

        # Add an expired entry directly via DB
        expired = PasswordCache(pdf_id="lazy-expired", password="oldpass")
        expired.created_at = datetime.now(timezone.utc) - timedelta(minutes=31)
        db_session.add(expired)
        db_session.commit()

        # Writing a new cache entry should trigger cleanup of expired entries
        _cache_password("new-pdf", "newpass")

        assert db_session.query(PasswordCache).filter(PasswordCache.pdf_id == "lazy-expired").first() is None
        assert db_session.query(PasswordCache).filter(PasswordCache.pdf_id == "new-pdf").first() is not None

        _clear_password_cache()

