import logging

import requests

from app.core.config import settings

logger = logging.getLogger("pdfeditor")


class EmailService:
    """Service for sending emails via SendGrid HTTP API.

    Uses the SendGrid v3 Mail Send API (HTTP) instead of SMTP, because
    Render's free tier blocks outbound SMTP (port 587). The SendGrid API
    key is passed as SMTP_PASSWORD in the .env file.
    """

    @staticmethod
    def send_password_reset_email(email: str, reset_token: str) -> bool:
        """Send password reset link via SendGrid HTTP API.

        Returns True if sent successfully, False if API key is not configured.
        """
        # Skip if API key not configured (development mode)
        api_key = settings.SMTP_PASSWORD
        if not api_key:
            logger.debug("DEV MODE: Password reset email not sent. Token for %s: %s", email, reset_token)
            return False

        try:
            reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

            # Send via SendGrid v3 Mail Send API
            # Docs: https://docs.sendgrid.com/api-reference/mail-send/mail-send
            response = requests.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "personalizations": [{"to": [{"email": email}]}],
                    "from": {
                        "email": settings.SMTP_FROM_EMAIL,
                        "name": "PDF Editor",
                    },
                    "subject": "Password Reset Request - PDF Editor",
                    "content": [
                        {
                            "type": "text/plain",
                            "value": (
                                f"Hello,\n\n"
                                f"You requested a password reset. Click the link below to reset your password:\n"
                                f"{reset_link}\n\n"
                                f"This link will expire in {settings.RESET_TOKEN_EXPIRE_MINUTES} minutes.\n\n"
                                f"If you didn't request this, please ignore this email.\n\n"
                                f"Best regards,\nPDF Editor Team"
                            ),
                        },
                        {
                            "type": "text/html",
                            "value": (
                                f"<html><body>"
                                f"<p>Hello,</p>"
                                f"<p>You requested a password reset. Click the link below to reset your password:</p>"
                                f"<p><a href=\"{reset_link}\">Reset Password</a></p>"
                                f"<p>Or copy this link: {reset_link}</p>"
                                f"<p>This link will expire in {settings.RESET_TOKEN_EXPIRE_MINUTES} minutes.</p>"
                                f"<p>If you didn't request this, please ignore this email.</p>"
                                f"<p>Best regards,<br>PDF Editor Team</p>"
                                f"</body></html>"
                            ),
                        },
                    ],
                },
                timeout=15,
            )

            if response.status_code in (200, 201, 202):
                logger.info("Password reset email sent successfully to %s", email)
                return True
            else:
                logger.error(
                    "SendGrid API error for %s: %s %s",
                    email, response.status_code, response.text,
                )
                return False

        except requests.RequestException as e:
            logger.exception("SendGrid HTTP error for %s", email)
            return False
        except Exception as e:
            logger.exception("Email Error for %s", email)
            return False
