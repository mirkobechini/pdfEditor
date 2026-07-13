"""Tests for CSRF middleware validation."""

from fastapi import status


class TestCSRFValidation:
    """Test CSRF validation with CSRF enabled."""

    def test_post_without_csrf_fails(self, client, monkeypatch):
        """Should reject POST without CSRF token on non-exempt endpoint."""
        monkeypatch.setattr("app.core.config.settings.DISABLE_CSRF", False)
        # POST to a non-exempt endpoint (e.g., /pdfs/upload) without CSRF
        response = client.post("/pdfs/upload")
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
        """Should accept POST with valid CSRF token on non-exempt endpoint."""
        monkeypatch.setattr("app.core.config.settings.DISABLE_CSRF", False)
        # GET to obtain CSRF cookie
        get_resp = client.get("/health")
        csrf_token = get_resp.cookies.get("csrf_token")
        assert csrf_token is not None, "No CSRF cookie in response"
        # Set cookie via client.headers (bypass httpx cookie jar which is
        # unreliable across versions in CI). This forces the Cookie header
        # on every subsequent request from this client.
        client.headers["Cookie"] = f"csrf_token={csrf_token}"
        # POST with valid CSRF
        response = client.post(
            "/pdfs/upload",
            headers={"X-CSRF-Token": csrf_token},
        )
        # Clean up to avoid affecting other tests
        del client.headers["Cookie"]
        # Should NOT be 403 (CSRF passed), should be 401 (no auth) or 422 (no file)
        assert response.status_code != status.HTTP_403_FORBIDDEN
