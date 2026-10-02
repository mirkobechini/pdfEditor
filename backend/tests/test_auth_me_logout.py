"""Tests for authentication API endpoints.

CRITICAL: These tests verify the REAL auth flow used in production:
cookie-based httpOnly JWT. The backend sets a httpOnly cookie on
login/register, and the frontend sends it via credentials: 'include'.
We test BOTH cookie-based and Bearer header flows because the backend
supports both (backward compatibility), but the cookie-based flow is
the one used in production (Cloudflare -> Render cross-origin).
"""

from fastapi import status

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

