"""Tests for security module (JWT, passwords, etc.)."""

from datetime import datetime, timedelta, timezone

import pytest

from app.core.config import settings
from app.core.security import create_access_token, decode_access_token, get_password_hash, verify_password


class TestPasswordHashing:
    """Test suite for password hashing."""

    def test_hash_password(self):
        """Should hash a plain password."""
        plain_password = "MySecurePassword123!"
        hashed = get_password_hash(plain_password)
        
        # Hashed should not equal plain
        assert hashed != plain_password
        # Hashed should be a bcrypt hash (starts with $2)
        assert hashed.startswith("$2")

    def test_verify_correct_password(self):
        """Should verify correct password."""
        plain_password = "MySecurePassword123!"
        hashed = get_password_hash(plain_password)
        
        assert verify_password(plain_password, hashed) is True

    def test_verify_incorrect_password(self):
        """Should reject incorrect password."""
        plain_password = "CorrectPassword"
        wrong_password = "WrongPassword"
        hashed = get_password_hash(plain_password)
        
        assert verify_password(wrong_password, hashed) is False

    def test_hash_is_unique(self):
        """Same password hashed twice should produce different hashes."""
        plain_password = "SamePassword"
        hash1 = get_password_hash(plain_password)
        hash2 = get_password_hash(plain_password)
        
        assert hash1 != hash2
        # But both should verify
        assert verify_password(plain_password, hash1) is True
        assert verify_password(plain_password, hash2) is True


class TestJWTTokens:
    """Test suite for JWT token creation and validation."""

    def test_create_access_token(self):
        """Should create a valid JWT token."""
        user_id = "test-user-123"
        token = create_access_token(data={"sub": user_id})
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_access_token_with_expiry(self):
        """Should create token with custom expiry."""
        user_id = "test-user-456"
        custom_expiry = timedelta(hours=2)
        token = create_access_token(data={"sub": user_id}, expires_delta=custom_expiry)
        
        payload = decode_access_token(token)
        assert payload is not None
        assert payload["sub"] == user_id

    def test_decode_valid_token(self):
        """Should decode a valid token."""
        user_id = "decode-test-user"
        token = create_access_token(data={"sub": user_id})
        
        payload = decode_access_token(token)
        assert payload is not None
        assert payload["sub"] == user_id
        assert "exp" in payload

    def test_decode_invalid_token(self):
        """Should reject invalid token."""
        invalid_token = "invalid.jwt.token"
        payload = decode_access_token(invalid_token)
        
        assert payload is None

    def test_decode_expired_token(self):
        """Should reject expired token."""
        # Create token with very short expiry (already expired)
        user_id = "expire-test-user"
        expired_delta = timedelta(seconds=-1)  # Already expired 1 second ago
        token = create_access_token(data={"sub": user_id}, expires_delta=expired_delta)
        
        payload = decode_access_token(token)
        assert payload is None

    def test_decode_tampered_token(self):
        """Should reject token with altered payload."""
        token = create_access_token(data={"sub": "original-user"})
        
        # Tamper with the token by changing a character
        tampered_token = token[:-5] + "xxxxx"
        
        payload = decode_access_token(tampered_token)
        assert payload is None

    def test_token_contains_correct_data(self):
        """Token should contain the data passed to create_access_token."""
        user_data = {"sub": "user-abc", "role": "admin", "email": "admin@example.com"}
        token = create_access_token(data=user_data)
        
        payload = decode_access_token(token)
        assert payload is not None
        assert payload["sub"] == "user-abc"
        assert payload["role"] == "admin"
        assert payload["email"] == "admin@example.com"
        assert "exp" in payload  # expiry should be added automatically

    def test_default_token_expiry(self):
        """Token should have default expiry from settings."""
        user_id = "default-expiry-user"
        token = create_access_token(data={"sub": user_id})
        
        payload = decode_access_token(token)
        assert payload is not None
        
        # Check expiry is approximately now + ACCESS_TOKEN_EXPIRE_MINUTES
        exp_time = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        now = datetime.now(timezone.utc)
        expected_expiry = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        # Allow 2-second tolerance
        assert abs((exp_time - expected_expiry).total_seconds()) < 2
