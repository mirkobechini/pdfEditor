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

    def test_post_with_valid_csrf_succeeds(self, monkeypatch):
        """Should accept POST with valid CSRF token on non-exempt endpoint."""
        import anyio
        from fastapi.responses import JSONResponse
        from starlette.requests import Request

        from app.core.csrf import CSRFMiddleware
        from app.main import app

        monkeypatch.setattr("app.core.config.settings.DISABLE_CSRF", False)

        csrf_token = "valid-csrf-token"

        async def _receive():
            return {"type": "http.request", "body": b"", "more_body": False}

        scope = {
            "type": "http",
            "asgi": {"version": "3.0", "spec_version": "2.3"},
            "http_version": "1.1",
            "method": "POST",
            "scheme": "http",
            "path": "/pdfs/upload",
            "raw_path": b"/pdfs/upload",
            "query_string": b"",
            "headers": [
                (b"cookie", f"csrf_token={csrf_token}".encode()),
                (b"x-csrf-token", csrf_token.encode()),
            ],
            "client": ("testclient", 50000),
            "server": ("testserver", 80),
        }
        request = Request(scope, _receive)

        middleware = CSRFMiddleware(app)
        called_next = {"value": False}

        async def call_next(_request):
            called_next["value"] = True
            return JSONResponse({"ok": True}, status_code=200)

        response = anyio.run(middleware.dispatch, request, call_next)
        assert response.status_code != status.HTTP_403_FORBIDDEN
        assert called_next["value"] is True


class TestCSRFRegression:
    """Regression tests for CSRF — login then upload with CSRF enabled.

    CRITICAL: After login, the csrf_token cookie must be set so that
    subsequent POST requests (like /pdfs/upload) work without a
    preliminary GET. This test validates the hotfix for issue #376.
    """

    def test_upload_after_login_with_csrf(self, client, monkeypatch, sample_pdf_content):
        """Login sets csrf_token → upload with CSRF enabled succeeds."""
        monkeypatch.setattr("app.core.config.settings.DISABLE_CSRF", False)

        # Register a user (auto-login + csrf_token cookie set)
        register_resp = client.post(
            "/auth/register",
            json={"email": "csrf@test.com", "password": "Password123", "full_name": "CSRF User"},
        )
        assert register_resp.status_code == status.HTTP_201_CREATED

        # PRODUCTION CHECK: csrf_token cookie is present after login
        csrf_token = client.cookies.get("csrf_token")
        assert csrf_token is not None, "csrf_token cookie must be set after login"
        assert len(csrf_token) == 64, "csrf_token must be 64 hex chars"

        # PRODUCTION CHECK: upload with valid CSRF token succeeds
        upload_resp = client.post(
            "/pdfs/upload",
            headers={
                "X-CSRF-Token": csrf_token,
            },
            files={"file": ("test.pdf", sample_pdf_content, "application/pdf")},
        )
        assert upload_resp.status_code == status.HTTP_201_CREATED, (
            f"Upload after login with CSRF should succeed, got {upload_resp.status_code}: {upload_resp.text}"
        )

    def test_upload_after_login_without_csrf_fails(self, client, monkeypatch):
        """Upload after login but WITHOUT CSRF header should fail."""
        monkeypatch.setattr("app.core.config.settings.DISABLE_CSRF", False)

        # Register a user (gets csrf_token cookie)
        client.post(
            "/auth/register",
            json={"email": "csrf2@test.com", "password": "Password123", "full_name": "CSRF User 2"},
        )

        # Upload without X-CSRF-Token header should fail
        upload_resp = client.post(
            "/pdfs/upload",
            files={"file": ("test.pdf", b"%PDF-1.4 fake content", "application/pdf")},
        )
        assert upload_resp.status_code == status.HTTP_403_FORBIDDEN
