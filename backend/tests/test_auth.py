"""Tests for authentication API endpoints.

CRITICAL: These tests verify the REAL auth flow used in production:
cookie-based httpOnly JWT. The backend sets a httpOnly cookie on
login/register, and the frontend sends it via credentials: 'include'.
We test BOTH cookie-based and Bearer header flows because the backend
supports both (backward compatibility), but the cookie-based flow is
the one used in production (Cloudflare -> Render cross-origin).
"""

from fastapi import status


class TestRegister:
    """Test suite for POST /auth/register."""

    URL = "/auth/register"

    def test_register_success(self, client):
        """Should register a new user and set httpOnly cookie."""
        response = client.post(
            self.URL,
            json={"email": "test@example.com", "password": "Password123", "full_name": "Test User"},
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

        # PRODUCTION CHECK: httpOnly cookie must be set on register (auto-login)
        cookies = client.cookies
        assert "access_token" in cookies
        assert cookies["access_token"] != ""

        # PRODUCTION CHECK: csrf_token cookie must be set for subsequent POSTs
        assert "csrf_token" in cookies
        assert cookies["csrf_token"] != ""

        # PRODUCTION CHECK: cookie must work for subsequent authenticated requests
        # (simulates browser sending cookie via credentials: 'include')
        me_resp = client.get("/auth/me")  # TestClient sends cookies automatically
        assert me_resp.status_code == status.HTTP_200_OK
        assert me_resp.json()["email"] == "test@example.com"

    def test_register_duplicate_email(self, client):
        """Should reject duplicate email."""
        client.post(
            self.URL,
            json={"email": "dup@example.com", "password": "Password123", "full_name": "User"},
        )
        response = client.post(
            self.URL,
            json={"email": "dup@example.com", "password": "Other123", "full_name": "User2"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already registered" in response.json()["detail"]

    def test_register_invalid_email(self, client):
        """Should reject invalid email."""
        response = client.post(
            self.URL,
            json={"email": "notanemail", "password": "Password123", "full_name": "User"},
        )
        assert response.status_code == 422


class TestLogin:
    """Test suite for POST /auth/login."""

    URL = "/auth/login"

    def test_login_success_sets_cookie(self, client):
        """Should login and set httpOnly cookie."""
        client.post(
            "/auth/register",
            json={"email": "login@example.com", "password": "Password123", "full_name": "Login User"},
        )
        # Clear cookies to simulate fresh browser (no cookies yet)
        client.cookies.clear()

        response = client.post(
            self.URL,
            json={"email": "login@example.com", "password": "Password123"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

        # PRODUCTION CHECK: cookie must be set
        assert "access_token" in client.cookies
        assert client.cookies["access_token"] != ""

        # PRODUCTION CHECK: csrf_token cookie must be set for subsequent POSTs
        assert "csrf_token" in client.cookies
        assert client.cookies["csrf_token"] != ""

        # PRODUCTION CHECK: cookie-based auth works for GET /auth/me
        me_resp = client.get("/auth/me")
        assert me_resp.status_code == status.HTTP_200_OK
        assert me_resp.json()["email"] == "login@example.com"

    def test_login_wrong_password(self, client):
        """Should reject wrong password."""
        client.post(
            "/auth/register",
            json={"email": "wrong@example.com", "password": "Correct1", "full_name": "User"},
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
            json={"email": "nobody@example.com", "password": "Password123"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestMe:
    """Test suite for GET /auth/me — cookie-based auth."""

    def _register_and_login(self, client):
        """Register a user and return the cookie jar (has access_token)."""
        client.post(
            "/auth/register",
            json={"email": "me@example.com", "password": "Password123", "full_name": "Me User"},
        )
        # After register, cookie is already set (auto-login)
        # But we also need a fresh login for some tests, so do it explicitly
        client.cookies.clear()
        client.post(
            "/auth/login",
            json={"email": "me@example.com", "password": "Password123"},
        )

    def test_get_me_success_with_cookie(self, client):
        """Cookie-based auth: GET /auth/me returns user profile."""
        self._register_and_login(client)

        # TestClient sends cookies automatically (simulating browser)
        response = client.get("/auth/me")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == "me@example.com"
        assert data["full_name"] == "Me User"

    def test_get_me_success_with_bearer(self, client):
        """Bearer header auth: GET /auth/me returns user profile (backward compat)."""
        client.post(
            "/auth/register",
            json={"email": "bearer@example.com", "password": "Password123", "full_name": "Bearer User"},
        )
        client.cookies.clear()
        resp = client.post(
            "/auth/login",
            json={"email": "bearer@example.com", "password": "Password123"},
        )
        token = resp.json()["access_token"]

        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == "bearer@example.com"

    def test_get_me_no_auth(self, client):
        """Should return 401 without any auth."""
        response = client.get("/auth/me")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_me_invalid_token(self, client):
        """Should return 401 with invalid Bearer token."""
        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalid_token"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_me_invalid_cookie(self, client):
        """Should return 401 with invalid cookie token."""
        client.cookies.set("access_token", "invalid-jwt-token")
        response = client.get("/auth/me")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_profile_success(self, client):
        """PUT /auth/me should update full_name."""
        self._register_and_login(client)

        response = client.put(
            "/auth/me",
            json={"full_name": "Updated Name"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["full_name"] == "Updated Name"
        assert data["email"] == "me@example.com"

    def test_update_profile_no_auth(self, client):
        """PUT /auth/me without auth should return 401."""
        response = client.put(
            "/auth/me",
            json={"full_name": "Hacker"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_profile_empty_name(self, client):
        """PUT /auth/me with null name should not change it."""
        self._register_and_login(client)

        response = client.put(
            "/auth/me",
            json={"full_name": None},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["full_name"] == "Me User"


class TestLogout:
    """Test suite for POST /auth/logout."""

    def test_logout_clears_cookie(self, client):
        """Logout should clear the access_token cookie."""
        # Register + login (cookie set)
        client.post(
            "/auth/register",
            json={"email": "logout@example.com", "password": "Password123", "full_name": "Logout User"},
        )
        assert "access_token" in client.cookies

        # Logout
        response = client.post("/auth/logout")
        assert response.status_code == status.HTTP_200_OK

        # Cookie should be cleared (empty value or expired)
        cookie_header = response.headers.get("set-cookie", "")
        assert "access_token=" in cookie_header
        # Either max-age=0 or expires=0 indicates cookie deletion
        assert "Max-Age=0" in cookie_header or "expires=0" in cookie_header or "expires=Thu, 01 Jan 1970" in cookie_header

        # Subsequent requests should be unauthenticated
        me_resp = client.get("/auth/me")
        assert me_resp.status_code == status.HTTP_401_UNAUTHORIZED


class TestPasswordReset:
    """Test suite for password reset endpoints."""

    URL_FORGOT = "/auth/forgot-password"
    URL_RESET = "/auth/reset-password"

    def _register_user(self, client, email="reset@test.com"):
        """Helper: register a user."""
        client.post(
            "/auth/register",
            json={"email": email, "password": "OldPass123", "full_name": "Reset User"},
        )

    def test_forgot_password_returns_202(self, client):
        """Should return 202 for existing user."""
        self._register_user(client)
        response = client.post(self.URL_FORGOT, json={"email": "reset@test.com"})
        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()
        assert "message" in data

    def test_forgot_password_unknown_email(self, client):
        """Should return 404 for unknown email."""
        response = client.post(self.URL_FORGOT, json={"email": "unknown@test.com"})
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "No account found" in response.json()["detail"]

    def test_reset_password_success(self, client, db_engine):
        """Should reset password with valid token."""
        from datetime import datetime, timedelta, timezone
        from sqlalchemy import text

        self._register_user(client)

        login_resp = client.post("/auth/login", json={"email": "reset@test.com", "password": "OldPass123"})
        assert login_resp.status_code == status.HTTP_200_OK

        with db_engine.connect() as conn:
            conn.execute(
                text("UPDATE users SET reset_token = 'test-valid-token', reset_token_expires = :exp WHERE email = 'reset@test.com'"),
                {"exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            )
            conn.commit()

        response = client.post(self.URL_RESET, json={"token": "test-valid-token", "new_password": "NewPass456"})
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["email"] == "reset@test.com"

        # New password works
        client.cookies.clear()
        login_resp = client.post("/auth/login", json={"email": "reset@test.com", "password": "NewPass456"})
        assert login_resp.status_code == status.HTTP_200_OK
        # Old password does not
        client.cookies.clear()
        login_resp = client.post("/auth/login", json={"email": "reset@test.com", "password": "OldPass123"})
        assert login_resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_reset_password_invalid_token(self, client):
        """Should reject invalid token."""
        response = client.post(self.URL_RESET, json={"token": "invalid-token", "new_password": "NewPass456"})
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

        response = client.post(self.URL_RESET, json={"token": "expired-token", "new_password": "NewPass456"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "expired" in response.json()["detail"]