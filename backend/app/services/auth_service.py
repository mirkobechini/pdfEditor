import logging

logger = logging.getLogger("pdfeditor")

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, decode_access_token, get_password_hash, verify_password
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.auth import UserResponse


def _validate_password_strength(password: str) -> None:
    """Validate password meets minimum strength requirements."""
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not any(c.isupper() for c in password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not any(c.islower() for c in password):
        raise ValueError("Password must contain at least one lowercase letter")
    if not any(c.isdigit() for c in password):
        raise ValueError("Password must contain at least one number")


class AuthService:
    """Business logic for authentication."""

    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def register(self, email: str, password: str, full_name: str) -> User:
        """Register a new user."""
        # Validate password strength
        _validate_password_strength(password)

        # Check duplicate email
        existing = self.repo.get_by_email(email)
        if existing:
            raise ValueError("Email already registered")

        hashed = get_password_hash(password)
        user = User(
            email=email,
            hashed_password=hashed,
            full_name=full_name,
        )
        return self.repo.create(user)

    def login(self, email: str, password: str) -> str:
        """Authenticate a user and return a JWT token."""
        user = self.repo.get_by_email(email)
        if not user:
            raise ValueError("Invalid email or password")

        if not verify_password(password, user.hashed_password):
            raise ValueError("Invalid email or password")

        if not user.is_active:
            raise ValueError("Account is inactive")

        return create_access_token(data={"sub": user.id})

    def get_current_user(self, token: str) -> User:
        """Validate a JWT token and return the user."""
        payload = decode_access_token(token)
        if payload is None:
            raise ValueError("Invalid or expired token")

        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Invalid token payload")

        user = self.repo.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if not user.is_active:
            raise ValueError("Account is inactive")

        return user

    def google_login(self, id_token_str: str) -> tuple[User, str]:
        """Authenticate with Google SSO. Returns (user, jwt_token).

        Uses google-auth-library which handles:
        - Automatic caching of Google's public keys (24h TTL)
        - Signature verification, audience check, expiry validation
        - Key rotation
        """
        if not id_token_str or not id_token_str.strip():
            raise ValueError("Invalid Google token")

        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests

        logger.debug("Validating Google token (first 30 chars): %s...", id_token_str[:30])
        try:
            info = google_id_token.verify_oauth2_token(
                id_token_str,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except ValueError as e:
            logger.warning("Google token validation failed: %s", e)
            raise ValueError("Invalid or expired Google token") from e

        email = info.get("email")
        if not email:
            raise ValueError("Google token missing email")

        name = info.get("name", email.split("@")[0])

        # Check if user exists, otherwise create
        user = self.repo.get_by_email(email)
        if not user:
            import secrets

            random_pw = secrets.token_urlsafe(32)
            hashed = get_password_hash(random_pw)
            user = User(
                email=email,
                hashed_password=hashed,
                full_name=name,
                google_id=info.get("sub"),
            )
            user = self.repo.create(user)
        else:
            # Update google_id if not already linked
            if not user.google_id:
                user.google_id = info.get("sub")
                self.repo.update(user)

        if not user.is_active:
            raise ValueError("Account is inactive")

        token = create_access_token(data={"sub": user.id})
        return user, token

    def request_password_reset(self, email: str) -> str | None:
        """Generate a reset token for the user. Returns the token if user exists, None otherwise.
        In production, the token would be sent via email. For now, returns it for testing.

        Before generating a new token, cleans up expired tokens in the database."""
        # Lazy cleanup: remove expired tokens before generating a new one
        self.repo.delete_expired_tokens()

        user = self.repo.get_by_email(email)
        if not user:
            return None

        import secrets
        from datetime import datetime, timedelta, timezone

        token = secrets.token_urlsafe(48)
        user.reset_token = token
        user.reset_token_expires = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(
            minutes=settings.RESET_TOKEN_EXPIRE_MINUTES,
        )
        self.repo.db.flush()
        return token

    def reset_password(self, token: str, new_password: str) -> User:
        """Reset the user's password using a valid reset token."""
        # Validate password strength
        _validate_password_strength(new_password)

        from datetime import datetime, timezone

        user = self.repo.get_by_reset_token(token)
        if not user:
            raise ValueError("Invalid or expired reset token")

        now = datetime.now(timezone.utc)
        if not user.reset_token_expires or user.reset_token_expires < now:
            raise ValueError("Reset token has expired")

        hashed = get_password_hash(new_password)
        updated = self.repo.update_password(user.id, hashed)
        if not updated:
            raise ValueError("Failed to update password")
        return updated