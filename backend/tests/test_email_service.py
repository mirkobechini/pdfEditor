"""Tests for email_service.py — SendGrid HTTP API email sending."""

from unittest.mock import MagicMock, patch

import pytest
import requests

from app.core.config import settings
from app.services.email_service import EmailService


class TestEmailService:
    """Test EmailService static methods."""

    SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send"

    def test_send_dev_mode_returns_false(self):
        """When SMTP_PASSWORD is empty, should return False (dev mode)."""
        with patch.object(settings, "SMTP_PASSWORD", ""):
            result = EmailService.send_password_reset_email("test@test.com", "token123")
        assert result is False

    def test_send_success_returns_true(self, monkeypatch):
        """When SendGrid API returns 202, should return True."""
        monkeypatch.setattr(settings, "SMTP_PASSWORD", "sendgrid-api-key")
        mock_response = MagicMock(status_code=202)

        with patch("requests.post", return_value=mock_response) as mock_post:
            result = EmailService.send_password_reset_email("test@test.com", "abc123")

        assert result is True
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert call_args[0][0] == self.SENDGRID_URL
        assert call_args[1]["headers"]["Authorization"] == "Bearer sendgrid-api-key"
        assert call_args[1]["json"]["personalizations"][0]["to"][0]["email"] == "test@test.com"
        assert call_args[1]["json"]["from"]["email"] == settings.SMTP_FROM_EMAIL

    def test_send_api_failure_returns_false(self, monkeypatch):
        """When SendGrid API returns 400, should return False."""
        monkeypatch.setattr(settings, "SMTP_PASSWORD", "sendgrid-api-key")
        mock_response = MagicMock(status_code=400, text="Bad request")

        with patch("requests.post", return_value=mock_response):
            result = EmailService.send_password_reset_email("test@test.com", "abc123")

        assert result is False

    def test_send_http_error_returns_false(self, monkeypatch):
        """When requests raises ConnectionError, should return False."""
        monkeypatch.setattr(settings, "SMTP_PASSWORD", "sendgrid-api-key")

        with patch("requests.post", side_effect=requests.RequestException("Connection failed")):
            result = EmailService.send_password_reset_email("test@test.com", "abc123")

        assert result is False

    def test_email_body_contains_reset_link(self, monkeypatch):
        """Email body should contain reset link with token."""
        monkeypatch.setattr(settings, "SMTP_PASSWORD", "sendgrid-api-key")
        mock_response = MagicMock(status_code=202)

        with patch("requests.post", return_value=mock_response) as mock_post:
            EmailService.send_password_reset_email("user@example.com", "my-token-123")

        sent_json = mock_post.call_args[1]["json"]
        plain_content = sent_json["content"][0]["value"]
        html_content = sent_json["content"][1]["value"]
        assert "my-token-123" in plain_content
        assert "my-token-123" in html_content
        assert "user@example.com" in sent_json["personalizations"][0]["to"][0]["email"]
        assert "PDF Editor" in sent_json["from"]["name"]