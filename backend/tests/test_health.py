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
