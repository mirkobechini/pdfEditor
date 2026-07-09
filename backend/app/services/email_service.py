import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


class EmailService:
    """Service for sending emails via SMTP."""

    @staticmethod
    def send_password_reset_email(email: str, reset_token: str) -> bool:
        """Send password reset link via email.
        
        Returns True if sent successfully, False if SMTP is not configured.
        """
        # Skip if SMTP not configured (development mode)
        if not settings.SMTP_PASSWORD or settings.SMTP_PASSWORD == "":
            print(f"[DEV MODE] Password reset email not sent. Reset token for {email}: {reset_token}")
            return False

        try:
            reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

            # Create email message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = "Password Reset Request"
            msg["From"] = settings.SMTP_FROM_EMAIL
            msg["To"] = email

            # Plain text version
            text = f"""
Hello,

You requested a password reset. Click the link below to reset your password:
{reset_link}

This link will expire in {settings.RESET_TOKEN_EXPIRE_MINUTES} minutes.

If you didn't request this, please ignore this email.

Best regards,
PDF Editor Team
"""

            # HTML version (better formatting)
            html = f"""
<html>
  <body>
    <p>Hello,</p>
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <p><a href="{reset_link}">Reset Password</a></p>
    <p>Or copy this link: {reset_link}</p>
    <p>This link will expire in {settings.RESET_TOKEN_EXPIRE_MINUTES} minutes.</p>
    <p>If you didn't request this, please ignore this email.</p>
    <p>Best regards,<br>PDF Editor Team</p>
  </body>
</html>
"""

            part1 = MIMEText(text, "plain")
            part2 = MIMEText(html, "html")
            msg.attach(part1)
            msg.attach(part2)

            # Send via SMTP
            with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, email, msg.as_string())

            print(f"Password reset email sent to {email}")
            return True

        except smtplib.SMTPException as e:
            print(f"SMTP Error: {e}")
            # Don't crash, just log the error
            return False
        except Exception as e:
            print(f"Email Error: {e}")
            return False
