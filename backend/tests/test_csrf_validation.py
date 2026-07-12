"""Tests for CSRF middleware validation."""

from fastapi import status


class TestCSRFValidation:
    """Test CSRF validation with CSRF enabled."""

    def test_post_without_csrf_fails(self, client, monkeypatch):
        """Should reject POST without CSRF token."""
        monkeypatch.setattr("app.core.config.settings.DISABLE_CSRF", False)
        response = client.post("/auth/logout")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_without_csrf_fails(self, client, monkeypatch):
        """Should reject DELETE without CSRF token."""
        monkeypatch.setattr("app.core.config.settings.DISABLE_CSRF", False)
        response = client.delete("/pdfs/fake-id")
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_auth_endpoints_exempt(self, client, monkeypatch):
        """Should allow POST to auth endpoints without CSRF."""
        monkeypatch.setattr("app.core.config.settings.DISABLE_CSRF", False)
        response = client.post(
            "/auth/login",
            json={"email": "test@test.com", "password": "Test1234"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_post_with_valid_csrf_succeeds(self, client, monkeypatch):
        """Should accept POST with valid CSRF token."""
        monkeypatch.setattr("app.core.config.settings.DISABLE_CSRF", False)
        # GET to obtain CSRF cookie
        get_resp = client.get("/health")
        csrf_token = get_resp.cookies.get("csrf_token")
        assert csrf_token is not None
        # POST with valid CSRF
        response = client.post(
            "/auth/logout",
            cookies={"csrf_token": csrf_token},
            headers={"X-CSRF-Token": csrf_token},
        )
        assert response.status_code == status.HTTP_200_OK
