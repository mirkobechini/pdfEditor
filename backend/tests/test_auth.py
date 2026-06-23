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
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


class TestLogin:
    """Test suite for POST /auth/login."""

    URL = "/auth/login"

    def test_login_success(self, client):
        """Should login and return JWT token."""
        # Register first
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