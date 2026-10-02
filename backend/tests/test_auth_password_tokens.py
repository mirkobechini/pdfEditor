"""Tests for authentication API endpoints.

CRITICAL: These tests verify the REAL auth flow used in production:
cookie-based httpOnly JWT. The backend sets a httpOnly cookie on
login/register, and the frontend sends it via credentials: 'include'.
We test BOTH cookie-based and Bearer header flows because the backend
supports both (backward compatibility), but the cookie-based flow is
the one used in production (Cloudflare -> Render cross-origin).
"""

from fastapi import status

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

class TestCsrfRefresh:
    """Test suite for GET /auth/csrf — re-sync CSRF token after page refresh."""

    URL = "/auth/csrf"

    def _login(self, client):
        """Register + login and return the response."""
        client.post(
            "/auth/register",
            json={"email": "csrf@test.com", "password": "Password123", "full_name": "CSRF Test"},
        )
        client.cookies.clear()
        resp = client.post(
            "/auth/login",
            json={"email": "csrf@test.com", "password": "Password123"},
        )
        return resp

    def test_csrf_refresh_returns_token_in_body(self, client):
        """GET /auth/csrf should return a fresh csrf_token in the body."""
        self._login(client)

        response = client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "csrf_token" in data
        assert len(data["csrf_token"]) == 64

    def test_csrf_refresh_sets_new_cookie(self, client):
        """GET /auth/csrf should also set the csrf_token cookie."""
        self._login(client)

        response = client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Cookie should match the body value
        cookie = client.cookies.get("csrf_token")
        assert cookie == data["csrf_token"]

    def test_csrf_refresh_requires_auth(self, client):
        """Unauthenticated request should return 401."""
        client.cookies.clear()
        response = client.get(self.URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

class TestTokenRefresh:
    """Test suite for POST /auth/refresh — JWT token refresh."""

    URL = "/auth/refresh"

    def _register_and_login(self, client, email="refresh@test.com"):
        """Register a user and return the token."""
        client.post(
            "/auth/register",
            json={"email": email, "password": "Password123", "full_name": "Refresh Test"},
        )
        client.cookies.clear()
        resp = client.post(
            "/auth/login",
            json={"email": email, "password": "Password123"},
        )
        return resp.json()["access_token"]

    def test_refresh_with_valid_token(self, client):
        """POST /auth/refresh with valid token should return new token."""
        token = self._register_and_login(client)

        response = client.post(
            self.URL,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "csrf_token" in data
        assert len(data["csrf_token"]) == 64

    def test_refresh_with_cookie(self, client):
        """POST /auth/refresh with cookie should work too."""
        self._register_and_login(client)

        response = client.post(self.URL)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data

    def test_refresh_sets_new_cookie(self, client):
        """POST /auth/refresh should set new httpOnly cookie."""
        self._register_and_login(client)

        response = client.post(self.URL)
        assert response.status_code == status.HTTP_200_OK

        # New cookie should be set
        assert "access_token" in client.cookies
        assert client.cookies["access_token"] != ""

        # New cookie should work for subsequent requests
        me_resp = client.get("/auth/me")
        assert me_resp.status_code == status.HTTP_200_OK

    def test_refresh_with_expired_token(self, client):
        """POST /auth/refresh with expired token should return new token."""
        from app.core.security import create_access_token
        from datetime import timedelta

        # Create a token that expired 1 minute ago
        expired_token = create_access_token(
            data={"sub": "nonexistent"},
            expires_delta=timedelta(minutes=-1),
        )

        response = client.post(
            self.URL,
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        # Token is expired but user doesn't exist — should fail
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_with_invalid_token(self, client):
        """POST /auth/refresh with invalid token should return 401."""
        response = client.post(
            self.URL,
            headers={"Authorization": "Bearer invalid-token"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_without_token(self, client):
        """POST /auth/refresh without token should return 401."""
        response = client.post(self.URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_for_inactive_user(self, client, db_engine):
        """POST /auth/refresh for inactive user should return 401."""
        from app.core.security import create_access_token
        from app.models.user import User
        from app.repositories.user_repo import UserRepository
        from sqlalchemy.orm import sessionmaker

        SessionLocal = sessionmaker(bind=db_engine)
        db = SessionLocal()
        try:
            repo = UserRepository(db)
            user = User(
                email="inactive@test.com",
                hashed_password="hash",
                full_name="Inactive User",
                is_active=False,
            )
            repo.create(user)
            db.commit()
            user_id = user.id
        finally:
            db.close()

        token = create_access_token(data={"sub": user_id})

        response = client.post(
            self.URL,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

