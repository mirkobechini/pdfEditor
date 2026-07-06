"""Tests for custom validation error handler."""

from fastapi import status


class TestValidationErrors:
    """Verify that Pydantic validation errors return clean messages."""

    LOGIN_URL = "/auth/login"
    REGISTER_URL = "/auth/register"

    def test_register_invalid_email(self, client):
        """Should return clean error for invalid email."""
        response = client.post(
            self.REGISTER_URL,
            json={"email": "invalid", "password": "pass123", "full_name": "Test"},
        )
        assert response.status_code == 422
        data = response.json()
        # Should be a flat string, not a list of errors
        assert isinstance(data["detail"], str)
        assert "email" in data["detail"].lower() or "invalid" in data["detail"].lower()

    def test_register_no_email(self, client):
        """Should return clean error for missing email."""
        response = client.post(
            self.REGISTER_URL,
            json={"password": "pass123", "full_name": "Test"},
        )
        assert response.status_code == 422
        data = response.json()
        assert isinstance(data["detail"], str)

    def test_login_empty_body(self, client):
        """Should return clean error for empty body."""
        response = client.post(
            self.LOGIN_URL,
            json={},
        )
        assert response.status_code == 422
        data = response.json()
        assert isinstance(data["detail"], str)