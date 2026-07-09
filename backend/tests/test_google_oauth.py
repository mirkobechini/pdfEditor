"""Tests for Google OAuth authentication."""

import json
from unittest.mock import MagicMock, patch

import pytest

from app.services.auth_service import AuthService


class TestGoogleAuth:
    """Test suite for Google OAuth authentication."""

    @patch("app.services.auth_service.requests.get")
    def test_google_login_invalid_token_format(self, mock_get, db):
        """Should reject malformed Google token."""
        service = AuthService(db)
        
        with pytest.raises(ValueError, match="Invalid or expired Google token"):
            service.google_login("not.a.valid.jwt.token")

    @patch("app.services.auth_service.requests.get")
    def test_google_login_empty_token(self, mock_get, db):
        """Should reject empty Google token."""
        service = AuthService(db)
        
        with pytest.raises(ValueError, match="Invalid Google token"):
            service.google_login("")

    @patch("app.services.auth_service.requests.get")
    def test_google_login_certs_fetch_failure(self, mock_get, db):
        """Should handle Google certs fetch failure."""
        service = AuthService(db)
        
        # Mock failed cert fetch
        mock_get.return_value = MagicMock(status_code=500)
        
        with pytest.raises(ValueError, match="Failed to verify Google token"):
            service.google_login("some.jwt.token")

    @patch("app.services.auth_service.requests.get")
    @patch("app.services.auth_service.jwt.get_unverified_header")
    def test_google_login_invalid_algorithm(self, mock_get_header, mock_get, db):
        """Should reject token with non-RS256 algorithm."""
        service = AuthService(db)
        
        # Mock successful cert fetch
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"keys": [{"kid": "key1", "n": "...", "e": "AQAB"}]}
        )
        
        # Mock header with wrong algorithm
        mock_get_header.return_value = {"alg": "HS256", "kid": "key1"}
        
        with pytest.raises(ValueError, match="Invalid token algorithm"):
            service.google_login("some.jwt.token")

    @patch("app.services.auth_service.requests.get")
    @patch("app.services.auth_service.jwt.get_unverified_header")
    def test_google_login_missing_kid(self, mock_get_header, mock_get, db):
        """Should reject token with missing kid."""
        service = AuthService(db)
        
        # Mock successful cert fetch
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"keys": [{"kid": "key1", "n": "...", "e": "AQAB"}]}
        )
        
        # Mock header without kid
        mock_get_header.return_value = {"alg": "RS256"}
        
        with pytest.raises(ValueError, match="Invalid token key ID"):
            service.google_login("some.jwt.token")

    @patch("app.services.auth_service.requests.get")
    @patch("app.services.auth_service.jwt.get_unverified_header")
    @patch("app.services.auth_service.jwt.decode")
    def test_google_login_decode_failure(self, mock_decode, mock_get_header, mock_get, db):
        """Should reject token if decode fails."""
        service = AuthService(db)
        
        # Mock successful cert fetch
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"keys": [{"kid": "key1", "n": "...", "e": "AQAB"}]}
        )
        
        # Mock header
        mock_get_header.return_value = {"alg": "RS256", "kid": "key1"}
        
        # Mock decode failure
        import jwt
        mock_decode.side_effect = jwt.InvalidTokenError("Signature verification failed")
        
        with pytest.raises(ValueError, match="Invalid or expired Google token"):
            service.google_login("some.jwt.token")

    @patch("app.services.auth_service.requests.get")
    @patch("app.services.auth_service.jwt.get_unverified_header")
    @patch("app.services.auth_service.jwt.decode")
    def test_google_login_missing_email(self, mock_decode, mock_get_header, mock_get, db):
        """Should reject token without email."""
        service = AuthService(db)
        
        # Mock successful cert fetch
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"keys": [{"kid": "key1", "n": "...", "e": "AQAB"}]}
        )
        
        # Mock header
        mock_get_header.return_value = {"alg": "RS256", "kid": "key1"}
        
        # Mock decode returning payload without email
        mock_decode.return_value = {"sub": "google-user-123", "name": "Test User"}
        
        with pytest.raises(ValueError, match="Google token missing email"):
            service.google_login("some.jwt.token")

    @patch("app.services.auth_service.requests.get")
    @patch("app.services.auth_service.jwt.get_unverified_header")
    @patch("app.services.auth_service.jwt.decode")
    def test_google_login_creates_user(self, mock_decode, mock_get_header, mock_get, db):
        """Should create new user from Google token."""
        service = AuthService(db)
        
        # Mock successful cert fetch
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"keys": [{"kid": "key1", "n": "...", "e": "AQAB"}]}
        )
        
        # Mock header
        mock_get_header.return_value = {"alg": "RS256", "kid": "key1"}
        
        # Mock decode returning valid Google payload
        mock_decode.return_value = {
            "sub": "google-user-123",
            "email": "newuser@gmail.com",
            "name": "New Google User"
        }
        
        user, token = service.google_login("some.jwt.token")
        
        # Verify user was created
        assert user.email == "newuser@gmail.com"
        assert user.full_name == "New Google User"
        assert user.google_id == "google-user-123"
        
        # Verify JWT token was returned
        assert token is not None
        assert isinstance(token, str)

    @patch("app.services.auth_service.requests.get")
    @patch("app.services.auth_service.jwt.get_unverified_header")
    @patch("app.services.auth_service.jwt.decode")
    def test_google_login_existing_user(self, mock_decode, mock_get_header, mock_get, db):
        """Should authenticate existing user with Google."""
        from app.models.user import User
        from app.repositories.user_repo import UserRepository
        
        # Pre-create user
        repo = UserRepository(db)
        existing_user = User(
            email="existing@gmail.com",
            hashed_password="dummy",
            full_name="Existing User",
            google_id="google-user-456"
        )
        repo.create(existing_user)
        
        service = AuthService(db)
        
        # Mock successful cert fetch
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"keys": [{"kid": "key1", "n": "...", "e": "AQAB"}]}
        )
        
        # Mock header
        mock_get_header.return_value = {"alg": "RS256", "kid": "key1"}
        
        # Mock decode
        mock_decode.return_value = {
            "sub": "google-user-456",
            "email": "existing@gmail.com",
            "name": "Existing User"
        }
        
        user, token = service.google_login("some.jwt.token")
        
        # Verify same user returned
        assert user.email == "existing@gmail.com"
        assert token is not None
