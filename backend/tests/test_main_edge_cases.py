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

class TestMainStartup:
    """Test main.py startup functions."""

    def test_validate_settings_missing_secret_key(self, monkeypatch):
        """_validate_settings should raise RuntimeError when SECRET_KEY is empty."""
        monkeypatch.setattr(settings, "SECRET_KEY", "")
        monkeypatch.setattr(settings, "JWT_SECRET_KEY", "")
        from app.main import _validate_settings
        with pytest.raises(RuntimeError, match="SECRET_KEY"):
            _validate_settings()

    def test_validate_settings_default_super_admin_in_production(self, monkeypatch):
        """_validate_settings should raise when SUPER_ADMIN_EMAIL is default in production."""
        monkeypatch.setattr(settings, "DEBUG", False)
        monkeypatch.setattr(settings, "SUPER_ADMIN_EMAIL", "admin@pdfeditor.local")
        monkeypatch.setattr(settings, "SECRET_KEY", "test-key")
        from app.main import _validate_settings
        with pytest.raises(RuntimeError, match="SUPER_ADMIN_EMAIL"):
            _validate_settings()

    def test_validate_settings_missing_google_client_id(self, monkeypatch):
        """_validate_settings should raise when GOOGLE_CLIENT_ID missing in production."""
        monkeypatch.setattr(settings, "DEBUG", False)
        monkeypatch.setattr(settings, "SUPER_ADMIN_EMAIL", "admin@example.com")
        monkeypatch.setattr(settings, "SECRET_KEY", "test-key")
        monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "")
        from app.main import _validate_settings
        with pytest.raises(RuntimeError, match="GOOGLE_CLIENT_ID"):
            _validate_settings()

    def test_validate_settings_passes_with_valid_config(self, monkeypatch):
        """_validate_settings should pass with valid configuration."""
        monkeypatch.setattr(settings, "SECRET_KEY", "test-key")
        monkeypatch.setattr(settings, "SUPER_ADMIN_EMAIL", "admin@example.com")
        monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-id")
        from app.main import _validate_settings
        _validate_settings()  # Should not raise

class TestAdminEdgeCasesAPI:
    """Test admin.py edge cases via API."""

    def test_update_license_denied_non_admin(self, client):
        """PUT /admin/users/{id}/license should deny non-admin users."""
        from tests.test_bug_report import _login
        token = _login(client, email="nonadmin_lic@test.com")

        response = client.put(
            "/admin/users/some-id/license",
            headers={"Authorization": f"Bearer {token}"},
            json={"license_tier": "lifetime"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_admin_denied_non_admin(self, client):
        """PUT /admin/users/{id}/admin should deny non-admin users."""
        from tests.test_bug_report import _login
        token = _login(client, email="nonadmin_adm@test.com")

        response = client.put(
            "/admin/users/some-id/admin",
            headers={"Authorization": f"Bearer {token}"},
            json={"is_admin": True},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_license_stripe_user_denied(self, client, db_engine):
        """Should deny modifying Stripe-paid license."""
        from tests.test_bug_report import _admin_login
        from sqlalchemy import text

        admin_token = _admin_login(client, db_engine)

        # Register a target user with stripe source
        client.post(
            "/auth/register",
            json={"email": "stripe_user@test.com", "password": "Stripe1234", "full_name": "Stripe User"},
        )
        resp = client.post("/auth/login", json={"email": "stripe_user@test.com", "password": "Stripe1234"})
        me = client.get("/auth/me", headers={"Authorization": f"Bearer {resp.json()['access_token']}"})
        target_id = me.json()["id"]

        # Set license_tier_source to stripe
        with db_engine.connect() as conn:
            conn.execute(
                text("UPDATE users SET license_tier_source = 'stripe' WHERE id = :uid"),
                {"uid": target_id},
            )
            conn.commit()

        response = client.put(
            f"/admin/users/{target_id}/license",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"license_tier": "lifetime"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
        detail = response.json()["detail"]
        assert detail["code"] == "STRIPE_LICENSE_LOCKED"

class TestAuthEdgeCasesAPI:
    """Test auth.py edge cases via API."""

    def test_update_me_invalid_token(self, client):
        """PUT /auth/me with invalid token should return 401."""
        response = client.put(
            "/auth/me",
            headers={"Authorization": "Bearer invalid-token"},
            json={"full_name": "Hacker"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

class TestAdminEdgeCasesAPIAdvanced:
    """Test admin.py edge cases not yet covered."""

    def test_admin_send_reset_dev_mode(self, client, db_engine, monkeypatch):
        """Should return dev mode message when SMTP not configured."""
        from tests.test_bug_report import _admin_login
        monkeypatch.setattr(settings, "SMTP_PASSWORD", "")

        admin_token = _admin_login(client, db_engine)

        # Register a target user
        client.post(
            "/auth/register",
            json={"email": "devmode_target@test.com", "password": "Target1234", "full_name": "Target"},
        )
        resp = client.post("/auth/login", json={"email": "devmode_target@test.com", "password": "Target1234"})
        me = client.get("/auth/me", headers={"Authorization": f"Bearer {resp.json()['access_token']}"})
        target_id = me.json()["id"]

        response = client.post(
            f"/admin/users/{target_id}/send-reset",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert "SMTP not configured" in response.json()["message"] or "Dev mode" in response.json()["message"]

class TestMainStartupAdvanced:
    """Test main.py startup — _cleanup_on_shutdown and _add_missing_columns."""

    def test_cleanup_on_shutdown(self, monkeypatch):
        """_cleanup_on_shutdown should run without error."""
        from app.main import _cleanup_on_shutdown
        from app.services.pdf_service import _clear_password_cache

        # Mock _clear_password_cache to verify it's called
        called = False
        original = _clear_password_cache
        def mock_clear():
            nonlocal called
            called = True
            original()

        monkeypatch.setattr("app.services.pdf_service._clear_password_cache", mock_clear)
        _cleanup_on_shutdown()
        assert called, "_clear_password_cache should have been called"

    def test_run_migrations(self):
        """_run_migrations should run without error."""
        from app.main import _run_migrations
        _run_migrations()

    def test_add_missing_columns_populates_null_default(self, db_engine):
        """_add_missing_columns should populate NULL values with the column default."""
        from sqlalchemy import text
        from app.main import _add_missing_columns
        import app.core.database as database_module

        # _add_missing_columns now uses database_module.engine (the test engine)
        engine = database_module.engine

        # Simulate a legacy DB: drop upload_source column, insert a row, then re-add
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE pdf_documents DROP COLUMN upload_source"))
            conn.commit()

        # Insert a row without upload_source (legacy data)
        import uuid
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        with engine.connect() as conn:
            conn.execute(
                text(
                    "INSERT INTO pdf_documents (id, user_id, original_filename, storage_filename, file_size, page_count, is_password_protected, created_at, updated_at) "
                    "VALUES (:id, :uid, 'test.pdf', 'test.pdf', 100, 1, 0, :now, :now)"
                ),
                {"id": str(uuid.uuid4()), "uid": str(uuid.uuid4()), "now": now},
            )
            conn.commit()

        # Re-add the column via _add_missing_columns (should populate NULL with 'web')
        _add_missing_columns()

        with engine.connect() as conn:
            result = conn.execute(text("SELECT upload_source FROM pdf_documents")).fetchall()
            assert result, "Expected at least one row"
            for row in result:
                assert row[0] == "web", f"Expected 'web', got {row[0]}"

    def test_seed_super_admin(self, monkeypatch, db_session):
        """_seed_super_admin should run without error (no user = no promotion)."""
        from app.main import _seed_super_admin
        _seed_super_admin()

    def test_seed_license_features(self):
        """_seed_license_features should run without error."""
        from app.main import _seed_license_features
        _seed_license_features()

