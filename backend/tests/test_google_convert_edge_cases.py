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

class TestGoogleLoginEndpoint:
    """Test POST /auth/google edge cases."""

    def test_google_login_via_dependency_override(self, client, monkeypatch):
        """POST /auth/google with mocked Google login should work."""
        from unittest.mock import MagicMock
        from app.services.auth_service import AuthService

        mock_service = MagicMock(spec=AuthService)
        mock_service.google_login.return_value = (
            MagicMock(id="user-id", is_active=True),
            "fake-jwt-token"
        )

        from app.api.v1.auth import get_auth_service
        fastapi_app.dependency_overrides[get_auth_service] = lambda: mock_service

        try:
            response = client.post(
                "/auth/google",
                json={"id_token": "valid-mock-token"},
            )
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert "access_token" in data
            assert data["access_token"] == "fake-jwt-token"
        finally:
            fastapi_app.dependency_overrides.clear()

    def test_google_login_value_error(self, client, monkeypatch):
        """POST /auth/google should return 401 when Google login raises ValueError."""
        from unittest.mock import MagicMock
        from app.services.auth_service import AuthService

        mock_service = MagicMock(spec=AuthService)
        mock_service.google_login.side_effect = ValueError("Invalid or expired Google token")

        from app.api.v1.auth import get_auth_service
        fastapi_app.dependency_overrides[get_auth_service] = lambda: mock_service

        try:
            response = client.post(
                "/auth/google",
                json={"id_token": "bad-token"},
            )
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
            data = response.json()
            # error_response wraps the payload under "detail"
            assert data["detail"]["code"] == "GOOGLE_AUTH_FAILED"
            assert "Invalid" in data["detail"]["detail"]
        finally:
            fastapi_app.dependency_overrides.clear()

class TestPdfServiceAdvanced:
    """Test pdf_service.py advanced error paths."""

    def test_export_unsupported_format(self, client, pro_headers, sample_pdf_content):
        """Should reject unsupported export format."""
        from tests.conftest import upload_pdf
        pdf_id = upload_pdf(client, pro_headers, sample_pdf_content)

        response = client.post(f"/pdfs/{pdf_id}/export?fmt=docx", headers=pro_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_reorder_invalid_page_count(self, client, pro_headers, sample_pdf_content):
        """Should reject reorder with wrong number of pages."""
        from tests.conftest import upload_pdf
        pdf_id = upload_pdf(client, pro_headers, sample_pdf_content)

        response = client.post(
            f"/pdfs/{pdf_id}/reorder",
            headers=pro_headers,
            json={"page_order": [1, 2, 3, 4, 5]},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_remove_pdf_not_found(self, client, pro_headers):
        """Should return 404 when deleting non-existent PDF."""
        response = client.delete(
            "/pdfs/non-existent-id",
            headers=pro_headers,
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

class TestConvertEdgeCases:
    """Test convert.py edge cases."""

    def test_import_no_filename(self, client, pro_headers):
        """POST /pdfs/import with empty filename should return 400."""
        response = client.post(
            "/pdfs/import",
            headers=pro_headers,
            files={"file": ("", b"content", "text/plain")},
        )
        assert response.status_code in (status.HTTP_400_BAD_REQUEST, 422)

    def test_import_value_error(self, client, pro_headers, monkeypatch):
        """POST /pdfs/import when service raises ValueError should return 400."""
        from app.services.pdf_service import PdfService
        from unittest.mock import MagicMock
        from app.api.v1 import convert as convert_module

        # Use dependency override to make import_file_to_pdf raise ValueError
        from app.main import app as fastapi_app
        from app.api.deps import get_pdf_service

        mock_service = MagicMock(spec=PdfService)
        mock_service.import_file_to_pdf.side_effect = ValueError("Conversion failed")

        # Override get_pdf_service for this test
        fastapi_app.dependency_overrides[get_pdf_service] = lambda: mock_service

        try:
            response = client.post(
                "/pdfs/import",
                headers=pro_headers,
                files={"file": ("test.txt", b"Hello World", "text/plain")},
            )
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "Conversion failed" in response.json()["detail"]
        finally:
            fastapi_app.dependency_overrides.clear()

class TestFinalCoverage:
    """Final batch of tests targeting remaining uncovered lines across modules."""

    def test_deps_get_current_user_value_error(self, client, monkeypatch):
        """get_current_user should return 401 when AuthService raises ValueError."""
        # Test via actual API with invalid token
        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalid-token"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_admin_update_user_admin_value_error(self, client, db_engine, monkeypatch):
        """PUT /admin/users/{id}/admin should return 400 when ValueError raised."""
        from tests.test_bug_report import _admin_login
        from sqlalchemy import text

        admin_token = _admin_login(client, db_engine)

        # Get admin user info
        me = client.get("/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        admin_id = me.json()["id"]

        # Make this user match SUPER_ADMIN_EMAIL to trigger ValueError on demote
        monkeypatch.setattr(settings, "SUPER_ADMIN_EMAIL", me.json()["email"])

        response = client.put(
            f"/admin/users/{admin_id}/admin",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_admin": False},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_admin_update_user_admin_not_found(self, client, db_engine):
        """PUT /admin/users/{id}/admin should return 404 for non-existent user."""
        from tests.test_bug_report import _admin_login
        admin_token = _admin_login(client, db_engine)

        response = client.put(
            "/admin/users/non-existent-id/admin",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_admin": True},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_auth_service_google_login_google_id_update(self, db_session, monkeypatch):
        """google_login should update google_id for existing user without one."""
        import uuid
        from unittest.mock import patch
        from app.core.security import get_password_hash

        user = User(
            id=str(uuid.uuid4()),
            email="google_noid@test.com",
            hashed_password=get_password_hash("dummy"),
            full_name="Google No ID",
            google_id=None,  # No google_id yet
            is_active=True,
        )
        db_session.add(user)
        db_session.flush()

        with patch("google.oauth2.id_token.verify_oauth2_token", return_value={
            "email": "google_noid@test.com",
            "sub": "new-google-sub",
        }):
            from app.services.auth_service import AuthService
            service = AuthService(db_session)
            user_result, token = service.google_login("fake-id-token")

            assert user_result.google_id == "new-google-sub"

    def test_main_seed_license_features_already_seeded(self):
        """_seed_license_features should not raise when already seeded."""
        from app.main import _seed_license_features
        _seed_license_features()  # Should succeed (already seeded from test setup)

    def test_export_txt_format(self, client, pro_headers, sample_pdf_content):
        """Should export PDF to TXT format."""
        from tests.conftest import upload_pdf
        pdf_id = upload_pdf(client, pro_headers, sample_pdf_content)

        response = client.post(f"/pdfs/{pdf_id}/export?fmt=txt", headers=pro_headers)
        assert response.status_code == status.HTTP_200_OK
        assert "text/plain" in response.headers["content-type"]

