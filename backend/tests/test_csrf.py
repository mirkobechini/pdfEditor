"""Tests for CSRF middleware."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


class TestCSRFMiddleware:
    """Test CSRF protection middleware.

    Note: conftest.py disables CSRF via DISABLE_CSRF=True. These tests
    re-enable it by monkeypatching the setting back to False.
    """

    @pytest.fixture(autouse=True)
    def _enable_csrf(self, monkeypatch):
        """Re-enable CSRF for this test class."""
        monkeypatch.setattr("app.core.config.settings.DISABLE_CSRF", False)

    def test_get_sets_csrf_cookie(self):
        """GET request should set csrf_token cookie if not present."""
        response = TestClient(app).get("/health")
        assert "csrf_token" in response.cookies

    def test_csrf_cookie_persists(self):
        """CSRF cookie should be stable across requests."""
        client = TestClient(app)
        response = client.get("/health")
        token = response.cookies["csrf_token"]
        assert len(token) == 64  # 32 bytes hex = 64 chars

    def test_auth_endpoints_exempt(self):
        """Auth endpoints should work without CSRF."""
        client = TestClient(app)
        response = client.post(
            "/auth/register",
            json={"email": "exempt@test.com", "password": "Password123", "full_name": "Exempt"},
        )
        assert response.status_code == 201
