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

    def test_update_profile_success(self, client):
        """PUT /auth/me should update full_name."""
        token = self.register_and_login(client)

        response = client.put(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            json={"full_name": "Updated Name"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["full_name"] == "Updated Name"
        assert data["email"] == "me@example.com"

    def test_update_profile_no_auth(self, client):
        """PUT /auth/me without token should return 401."""
        response = client.put(
            "/auth/me",
            json={"full_name": "Hacker"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_profile_empty_name(self, client):
        """PUT /auth/me with null name should not change it."""
        token = self.register_and_login(client)

        response = client.put(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            json={"full_name": None},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["full_name"] == "Me User"

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