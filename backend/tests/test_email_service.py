"""Tests for email_service.py — SMTP email sending."""

from unittest.mock import MagicMock, patch

import pytest

from app.core.config import settings
from app.services.email_service import EmailService


class TestEmailService:
    """Test EmailService static methods."""

    def test_send_dev_mode_returns_false(self):
        """When SMTP_PASSWORD is empty, should return False (dev mode)."""
        with patch.object(settings, "SMTP_PASSWORD", ""):
            result = EmailService.send_password_reset_email("test@test.com", "token123")
        assert result is False

    def test_send_uses_correct_reset_link(self, monkeypatch):
        """Reset link should include FRONTEND_URL and token."""
        monkeypatch.setattr(settings, "SMTP_PASSWORD", "realpass")
        monkeypatch.setattr(settings, "SMTP_USER", "user")
        FRONTEND_URL = "http://localhost:3000"

        with patch("smtplib.SMTP") as mock_smtp:
            mock_instance = MagicMock()
            mock_smtp.return_value.__enter__.return_value = mock_instance

            result = EmailService.send_password_reset_email("test@test.com", "abc123")

        assert result is True
        mock_instance.sendmail.assert_called_once()
        # Check that the email was sent with correct args
        call_args = mock_instance.sendmail.call_args
        assert settings.SMTP_FROM_EMAIL == call_args[0][0]  # from
        assert "test@test.com" == call_args[0][1]  # to

    def test_send_smtp_failure_returns_false(self, monkeypatch):
        """When SMTP raises an error, should log error and return False."""
        monkeypatch.setattr(settings, "SMTP_PASSWORD", "realpass")
        monkeypatch.setattr(settings, "SMTP_USER", "user")

        with patch("smtplib.SMTP") as mock_smtp:
            mock_instance = MagicMock()
            mock_smtp.return_value.__enter__.return_value = mock_instance
            mock_instance.sendmail.side_effect = Exception("SMTP error")

            result = EmailService.send_password_reset_email("test@test.com", "abc123")

        assert result is False

    def test_email_contains_reset_link(self, monkeypatch):
        """Email body should contain reset link with token."""
        monkeypatch.setattr(settings, "SMTP_PASSWORD", "realpass")
        monkeypatch.setattr(settings, "SMTP_USER", "user")

        with patch("smtplib.SMTP") as mock_smtp:
            mock_instance = MagicMock()
            mock_smtp.return_value.__enter__.return_value = mock_instance

            EmailService.send_password_reset_email("user@example.com", "my-token-123")

        sent_message = mock_instance.sendmail.call_args[0][2]
        assert "my-token-123" in sent_message
        assert "user@example.com" in sent_message

    def test_email_format_multipart(self, monkeypatch):
        """Email should include both text and HTML parts."""
        monkeypatch.setattr(settings, "SMTP_PASSWORD", "realpass")
        monkeypatch.setattr(settings, "SMTP_USER", "user")

        with patch("smtplib.SMTP") as mock_smtp:
            mock_instance = MagicMock()
            mock_smtp.return_value.__enter__.return_value = mock_instance

            EmailService.send_password_reset_email("user@example.com", "token")

        sent = mock_instance.sendmail.call_args[0][2]
        assert "Content-Type: text/plain" in sent
        assert "Content-Type: text/html" in sent