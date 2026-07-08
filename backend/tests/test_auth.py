"""Tests for authentication API endpoints."""

from fastapi import status


class TestRegister:
    """Test suite for POST /auth/register."""

    URL = "/auth/register"

    def test_register_success(self, client):
        """Should register a new user."""
        response = client.post(
            self.URL,
            json={"email": "test@example.com", "password": "password123", "full_name": "Test User"},
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["full_name"] == "Test User"
        assert data["is_active"] is True
        assert "password" not in data
        assert "id" in data

    def test_register_duplicate_email(self, client):
        """Should reject duplicate email."""
        client.post(
            self.URL,
            json={"email": "dup@example.com", "password": "password123", "full_name": "User"},
        )
        response = client.post(
            self.URL,
            json={"email": "dup@example.com", "password": "other123", "full_name": "User2"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already registered" in response.json()["detail"]

    def test_register_invalid_email(self, client):
        """Should reject invalid email."""
        response = client.post(
            self.URL,
            json={"email": "notanemail", "password": "password123", "full_name": "User"},
        )
        assert response.status_code == 422


class TestLogin:
    """Test suite for POST /auth/login."""

    URL = "/auth/login"

    def test_login_success(self, client):
        """Should login and return JWT token."""
        client.post(
            "/auth/register",
            json={"email": "login@example.com", "password": "password123", "full_name": "Login User"},
        )

        response = client.post(
            self.URL,
            json={"email": "login@example.com", "password": "password123"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client):
        """Should reject wrong password."""
        client.post(
            "/auth/register",
            json={"email": "wrong@example.com", "password": "correct", "full_name": "User"},
        )

        response = client.post(
            self.URL,
            json={"email": "wrong@example.com", "password": "wrong"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_non_existent(self, client):
        """Should reject non-existent user."""
        response = client.post(
            self.URL,
            json={"email": "nobody@example.com", "password": "password123"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestMe:
    """Test suite for GET /auth/me."""

    def register_and_login(self, client):
        """Register a user and return the JWT token."""
        client.post(
            "/auth/register",
            json={"email": "me@example.com", "password": "password123", "full_name": "Me User"},
        )
        resp = client.post(
            "/auth/login",
            json={"email": "me@example.com", "password": "password123"},
        )
        return resp.json()["access_token"]

    def test_get_me_success(self, client):
        """Should return current user profile."""
        token = self.register_and_login(client)

        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == "me@example.com"
        assert data["full_name"] == "Me User"

    def test_get_me_no_token(self, client):
        """Should return 401 without token."""
        response = client.get("/auth/me")
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_get_me_invalid_token(self, client):
        """Should return 401 with invalid token."""
        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalid_token"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestGoogleSSO:
    """Test suite for POST /auth/google."""

    FAKE_PAYLOAD = {
        "sub": "google-12345",
        "email": "googleuser@example.com",
        "name": "Google User",
    }

    def _mock_google(self):
        """Mock Google SSO: requests.get, get_unverified_header, and jose.jwt.decode.
        This breaks real JWT verification, so tests must use db_engine, not /auth/me."""
        import unittest.mock as mock

        mock_get = mock.patch("requests.get")
        mock_header = mock.patch("jose.jwt.get_unverified_header")
        mock_decode = mock.patch("jose.jwt.decode")

        mock_get_instance = mock_get.start()
        mock_header_instance = mock_header.start()
        mock_decode_instance = mock_decode.start()

        fake_response = mock.MagicMock()
        fake_response.status_code = 200
        fake_response.json.return_value = {"keys": [{"kty": "RSA", "kid": "fake-kid-123", "n": "fake", "e": "AQAB"}]}
        mock_get_instance.return_value = fake_response

        mock_header_instance.return_value = {"kid": "fake-kid-123", "alg": "RS256"}
        mock_decode_instance.return_value = self.FAKE_PAYLOAD

        return mock_get, mock_header, mock_decode

    def test_google_login_invalid_token(self, client):
        """Should reject an invalid Google id_token."""
        response = client.post(
            "/auth/google",
            json={"id_token": "fake.google.token.12345"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_google_login_empty_token(self, client):
        """Should reject empty token."""
        response = client.post(
            "/auth/google",
            json={"id_token": ""},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_google_login_new_user(self, client, db_engine):
        """Should create a new user via Google SSO and return JWT."""
        get_p, header_p, decode_p = self._mock_google()
        try:
            response = client.post(
                "/auth/google",
                json={"id_token": "valid.google.token"},
            )
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert "access_token" in data
            assert data["token_type"] == "bearer"

            # Verify user created in DB
            from sqlalchemy import text
            with db_engine.connect() as conn:
                row = conn.execute(
                    text("SELECT email, full_name, is_active FROM users WHERE email = :e"),
                    {"e": "googleuser@example.com"},
                ).fetchone()
            assert row is not None
            assert row._mapping["email"] == "googleuser@example.com"
            assert row._mapping["full_name"] == "Google User"
            assert row._mapping["is_active"] == 1
        finally:
            get_p.stop()
            header_p.stop()
            decode_p.stop()

    def test_google_login_existing_user(self, client, db_engine):
        """Should login existing user via Google SSO (no duplicate)."""
        get_p, header_p, decode_p = self._mock_google()
        try:
            # First login creates the user
            response1 = client.post(
                "/auth/google",
                json={"id_token": "valid.google.token"},
            )
            assert response1.status_code == status.HTTP_200_OK
            token1 = response1.json()["access_token"]

            # Second login returns a new token for the same user
            response2 = client.post(
                "/auth/google",
                json={"id_token": "valid.google.token"},
            )
            assert response2.status_code == status.HTTP_200_OK
            token2 = response2.json()["access_token"]

            # Verify only ONE user exists (no duplicate created)
            from sqlalchemy import text
            with db_engine.connect() as conn:
                count = conn.execute(
                    text("SELECT COUNT(*) FROM users WHERE email = :e"),
                    {"e": "googleuser@example.com"},
                ).scalar()
            assert count == 1
        finally:
            get_p.stop()
            header_p.stop()
            decode_p.stop()

    def test_google_login_inactive_user(self, client, db_engine):
        """Should reject Google login for deactivated user."""
        from sqlalchemy import text

        get_p, header_p, decode_p = self._mock_google()
        try:
            # First login creates the user
            response1 = client.post(
                "/auth/google",
                json={"id_token": "valid.google.token"},
            )
            assert response1.status_code == status.HTTP_200_OK

            # Deactivate user directly in DB
            with db_engine.connect() as conn:
                conn.execute(
                    text("UPDATE users SET is_active = 0 WHERE email = :e"),
                    {"e": "googleuser@example.com"},
                )
                conn.commit()

            # Next login attempt should fail
            response2 = client.post(
                "/auth/google",
                json={"id_token": "valid.google.token"},
            )
            assert response2.status_code == status.HTTP_401_UNAUTHORIZED
        finally:
            get_p.stop()
            header_p.stop()
            decode_p.stop()


class TestPasswordReset:
    """Test suite for password reset endpoints."""

    URL_FORGOT = "/auth/forgot-password"
    URL_RESET = "/auth/reset-password"

    def _register_user(self, client, email="reset@test.com"):
        """Helper: register a user."""
        client.post(
            "/auth/register",
            json={"email": email, "password": "oldpass123", "full_name": "Reset User"},
        )

    def test_forgot_password_returns_202(self, client):
        """Should always return 202."""
        self._register_user(client)
        response = client.post(self.URL_FORGOT, json={"email": "reset@test.com"})
        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()
        assert "message" in data

    def test_forgot_password_unknown_email(self, client):
        """Should return 202 even for unknown email (no enumeration)."""
        response = client.post(self.URL_FORGOT, json={"email": "unknown@test.com"})
        assert response.status_code == status.HTTP_202_ACCEPTED

    def test_reset_password_success(self, client, db_engine):
        """Should reset password with valid token."""
        from datetime import datetime, timedelta, timezone
        from sqlalchemy import text

        self._register_user(client)

        login_resp = client.post("/auth/login", json={"email": "reset@test.com", "password": "oldpass123"})
        assert login_resp.status_code == status.HTTP_200_OK

        with db_engine.connect() as conn:
            conn.execute(
                text("UPDATE users SET reset_token = 'test-valid-token', reset_token_expires = :exp WHERE email = 'reset@test.com'"),
                {"exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            )
            conn.commit()

        response = client.post(self.URL_RESET, json={"token": "test-valid-token", "new_password": "newpass456"})
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["email"] == "reset@test.com"

        login_resp = client.post("/auth/login", json={"email": "reset@test.com", "password": "newpass456"})
        assert login_resp.status_code == status.HTTP_200_OK

        login_resp = client.post("/auth/login", json={"email": "reset@test.com", "password": "oldpass123"})
        assert login_resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_reset_password_invalid_token(self, client):
        """Should reject invalid token."""
        response = client.post(self.URL_RESET, json={"token": "invalid-token", "new_password": "newpass456"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid" in response.json()["detail"]

    def test_reset_password_expired_token(self, client, db_engine):
        """Should reject expired token."""
        from datetime import datetime, timedelta, timezone
        from sqlalchemy import text

        self._register_user(client)

        with db_engine.connect() as conn:
            conn.execute(
                text("UPDATE users SET reset_token = 'expired-token', reset_token_expires = :exp WHERE email = 'reset@test.com'"),
                {"exp": datetime.now(timezone.utc) - timedelta(hours=1)},
            )
            conn.commit()

        response = client.post(self.URL_RESET, json={"token": "expired-token", "new_password": "newpass456"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "expired" in response.json()["detail"]