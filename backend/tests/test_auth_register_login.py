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

        # PRODUCTION CHECK: csrf_token in response body (needed for cross-origin)
        assert "csrf_token" in data
        assert len(data["csrf_token"]) == 64

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

        # PRODUCTION CHECK: csrf_token in response body (needed for cross-origin)
        assert "csrf_token" in data
        assert len(data["csrf_token"]) == 64

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

    def test_login_csrf_token_in_body(self, client):
        """Login response body should include csrf_token for cross-origin frontend."""
        client.post(
            "/auth/register",
            json={"email": "login-csrf@test.com", "password": "Password123", "full_name": "CSRF Body"},
        )
        client.cookies.clear()

        response = client.post(
            "/auth/login",
            json={"email": "login-csrf@test.com", "password": "Password123"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "csrf_token" in data
        assert len(data["csrf_token"]) == 64
        assert data["csrf_token"] == client.cookies.get("csrf_token")

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

