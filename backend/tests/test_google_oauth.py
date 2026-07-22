"""Tests for Google OAuth authentication.

These tests mock google.oauth2.id_token.verify_oauth2_token instead of
the old PyJWT + requests.get flow, since we now use google-auth-library.
"""

from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import sessionmaker

from app.services.auth_service import AuthService


@pytest.fixture
def db_session(db_engine):
    """Create a database session for this test."""
    if db_engine is None:
        pytest.skip("Database engine not available")
    SessionLocal = sessionmaker(bind=db_engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


class TestGoogleAuth:
    """Test suite for Google OAuth authentication."""

    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_google_login_invalid_token_format(self, mock_verify, db_session):
        """Should reject malformed Google token."""
        service = AuthService(db_session)

        # Mock verify_oauth2_token to raise ValueError (invalid token)
        mock_verify.side_effect = ValueError("Invalid token")

        with pytest.raises(ValueError, match="Invalid or expired Google token"):
            service.google_login("not.a.valid.jwt.token")

    def test_google_login_empty_token(self, db_session):
        """Should reject empty Google token."""
        service = AuthService(db_session)

        with pytest.raises(ValueError, match="Invalid Google token"):
            service.google_login("")

    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_google_login_missing_email(self, mock_verify, db_session):
        """Should reject token without email."""
        service = AuthService(db_session)

        # Mock verify returning payload without email
        mock_verify.return_value = {"sub": "google-user-123", "name": "Test User"}

        with pytest.raises(ValueError, match="Google token missing email"):
            service.google_login("some.jwt.token")

    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_google_login_creates_user(self, mock_verify, db_session):
        """Should create new user from Google token."""
        service = AuthService(db_session)

        # Mock verify returning valid Google payload
        mock_verify.return_value = {
            "sub": "google-user-123",
            "email": "newuser@gmail.com",
            "name": "New Google User",
        }

        user, token = service.google_login("some.jwt.token")

        # Verify user was created
        assert user.email == "newuser@gmail.com"
        assert user.full_name == "New Google User"
        assert user.google_id == "google-user-123"

        # Verify JWT token was returned
        assert token is not None
        assert isinstance(token, str)

    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_google_login_existing_user(self, mock_verify, db_session):
        """Should authenticate existing user with Google."""
        from app.models.user import User
        from app.repositories.user_repo import UserRepository

        # Pre-create user
        repo = UserRepository(db_session)
        existing_user = User(
            email="existing@gmail.com",
            hashed_password="dummy",
            full_name="Existing User",
            google_id="google-user-456",
        )
        repo.create(existing_user)

        service = AuthService(db_session)

        # Mock verify
        mock_verify.return_value = {
            "sub": "google-user-456",
            "email": "existing@gmail.com",
            "name": "Existing User",
        }

        user, token = service.google_login("some.jwt.token")

        # Verify same user returned
        assert user.email == "existing@gmail.com"
        assert token is not None
