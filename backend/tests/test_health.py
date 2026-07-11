"""Tests for the health check endpoint and middleware."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestHealthCheck:
    """Test suite for GET /health."""

    def test_health_returns_ok(self):
        """Should return 200 with status ok."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_request_id_header(self):
        """Request ID middleware should add X-Request-ID header."""
        response = client.get("/health")
        assert "x-request-id" in response.headers

    def test_request_id_propagated(self):
        """If client sends X-Request-ID, it should be reflected back."""
        response = client.get("/health", headers={"X-Request-ID": "my-test-id"})
        assert response.headers.get("x-request-id") == "my-test-id"

    def test_cors_headers_with_origin(self):
        """CORS headers should be present when Origin header is sent."""
        response = client.get("/health", headers={"Origin": "http://localhost:3000"})
        assert "access-control-allow-origin" in response.headers

    def test_validation_error_handler(self):
        """Validation errors should return flattened message."""
        response = client.post("/auth/register", json={"email": "invalid"})
        assert response.status_code == 422
        assert "detail" in response.json()

    def test_health_returns_200_without_auth(self):
        """Health endpoint should be accessible without authentication."""
        response = client.get("/health")
        assert response.status_code == 200
