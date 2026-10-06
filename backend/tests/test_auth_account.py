"""Tests for authentication API endpoints.

CRITICAL: These tests verify the REAL auth flow used in production:
cookie-based httpOnly JWT. The backend sets a httpOnly cookie on
login/register, and the frontend sends it via credentials: 'include'.
We test BOTH cookie-based and Bearer header flows because the backend
supports both (backward compatibility), but the cookie-based flow is
the one used in production (Cloudflare -> Render cross-origin).
"""

from fastapi import status

class TestUnlinkGoogle:
    """Test suite for POST /auth/unlink/google."""

    URL = "/auth/unlink/google"

    def _register_and_login(self, client, email="unlink@test.com"):
        """Register a user and return the token."""
        client.post(
            "/auth/register",
            json={"email": email, "password": "Password123", "full_name": "Unlink Test"},
        )
        client.cookies.clear()
        resp = client.post(
            "/auth/login",
            json={"email": email, "password": "Password123"},
        )
        return resp.json()["access_token"]

    def test_unlink_success(self, client, db_engine):
        """POST /auth/unlink/google should unlink Google when password is correct."""
        from app.core.security import get_password_hash
        from app.models.user import User
        from app.repositories.user_repo import UserRepository
        from sqlalchemy.orm import sessionmaker

        SessionLocal = sessionmaker(bind=db_engine)
        db = SessionLocal()
        try:
            # Create user with google_id set
            repo = UserRepository(db)
            user = User(
                email="unlink_success@test.com",
                hashed_password=get_password_hash("Password123"),
                full_name="Unlink Success",
                google_id="google-123",
            )
            repo.create(user)
            db.commit()
        finally:
            db.close()

        # Login
        client.cookies.clear()
        resp = client.post(
            "/auth/login",
            json={"email": "unlink_success@test.com", "password": "Password123"},
        )
        assert resp.status_code == 200

        response = client.post(
            self.URL,
            json={"password": "Password123"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["google_id"] is None

    def test_unlink_wrong_password(self, client):
        """POST /auth/unlink/google should return 403 with wrong password."""
        self._register_and_login(client)

        response = client.post(
            self.URL,
            json={"password": "wrongpassword"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unlink_no_google(self, client):
        """POST /auth/unlink/google should return 400 when Google not linked."""
        token = self._register_and_login(client)

        response = client.post(
            self.URL,
            json={"password": "Password123"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unlink_unauthorized(self, client):
        """POST /auth/unlink/google should return 401 without auth."""
        response = client.post(
            self.URL,
            json={"password": "Password123"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

class TestSyncUser:
    """Test suite for POST /auth/sync — cloud user sync into local sidecar DB."""

    URL = "/auth/sync"

    def _sync_payload(self, email="sync@test.com", user_id="cloud-id-1", full_name="Sync User"):
        return {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "is_active": True,
            "is_admin": False,
            "is_guest": False,
            "license_tier": "free",
            "license_tier_source": "admin",
            "google_id": "google-123",
        }

    def test_sync_creates_new_user(self, client):
        """POST /auth/sync should create a new user and return local JWT."""
        response = client.post(self.URL, json=self._sync_payload())
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "csrf_token" in data
        assert len(data["csrf_token"]) == 64

        # The new user should be able to getMe with the local token
        me_resp = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {data['access_token']}"},
        )
        assert me_resp.status_code == status.HTTP_200_OK
        assert me_resp.json()["email"] == "sync@test.com"

    def test_sync_updates_existing_user_by_id(self, client):
        """POST /auth/sync should update user when ID matches."""
        # First sync creates the user
        client.post(self.URL, json=self._sync_payload())
        # Second sync with same ID updates (no duplicate error)
        response = client.post(
            self.URL,
            json=self._sync_payload(full_name="Updated Name"),
        )
        assert response.status_code == status.HTTP_200_OK

    def test_sync_same_email_different_id_reuses_local_user(self, client):
        """CRITICAL: sync with same email but different ID (Google login case)
        must NOT crash with UNIQUE constraint — it should reuse the local user
        and update it with cloud data."""
        # Create a local user first (as if registered locally before cloud sync)
        client.post(
            "/auth/register",
            json={"email": "sync@test.com", "password": "Password123", "full_name": "Local User"},
        )
        client.cookies.clear()

        # Now sync the SAME email but with a DIFFERENT cloud ID (Google login case)
        response = client.post(
            self.URL,
            json=self._sync_payload(email="sync@test.com", user_id="different-cloud-id"),
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data

        # The local user should now have the google_id set (updated, not duplicated)
        me_resp = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {data['access_token']}"},
        )
        assert me_resp.status_code == status.HTTP_200_OK
        assert me_resp.json()["email"] == "sync@test.com"
        assert me_resp.json()["google_id"] == "google-123"

    def test_sync_with_password_allows_offline_login(self, client):
        """POST /auth/sync with password should allow local login later."""
        response = client.post(
            self.URL,
            json={**self._sync_payload(email="sync-pw@test.com"), "password": "SyncPass123"},
        )
        assert response.status_code == status.HTTP_200_OK

        # Local login with the synced password should work
        client.cookies.clear()
        login_resp = client.post(
            "/auth/login",
            json={"email": "sync-pw@test.com", "password": "SyncPass123"},
        )
        assert login_resp.status_code == status.HTTP_200_OK

class TestGuestAccess:
    """Test suite for POST /auth/guest and POST /auth/guest/convert."""

    GUEST_URL = "/auth/guest"
    CONVERT_URL = "/auth/guest/convert"

    def test_guest_login_creates_user(self, client):
        """POST /auth/guest should create a guest user and return token + user."""
        response = client.post(self.GUEST_URL)
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "csrf_token" in data

        # PRODUCTION CHECK: must return user object
        assert "user" in data
        assert data["user"]["is_guest"] is True
        assert data["user"]["email"].startswith("guest-")
        assert data["user"]["email"].endswith("@pdfeditor.local")

        # PRODUCTION CHECK: httpOnly cookie must be set
        assert "access_token" in client.cookies
        assert client.cookies["access_token"] != ""

        # Cookie-based auth must work
        me_resp = client.get("/auth/me")
        assert me_resp.status_code == status.HTTP_200_OK
        assert me_resp.json()["is_guest"] is True

    def test_guest_login_unique_each_time(self, client):
        """Each guest login creates a different user."""
        resp1 = client.post(self.GUEST_URL)
        client.cookies.clear()
        resp2 = client.post(self.GUEST_URL)
        assert resp1.json()["user"]["id"] != resp2.json()["user"]["id"]

    def test_guest_convert_success(self, client):
        """POST /auth/guest/convert should convert guest to full user."""
        # Create guest
        guest_resp = client.post(self.GUEST_URL)
        assert guest_resp.status_code == status.HTTP_201_CREATED

        # Convert
        response = client.post(
            self.CONVERT_URL,
            json={
                "email": "converted@example.com",
                "password": "StrongPass1",
                "full_name": "Converted User",
            },
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data

        # Verify user is no longer guest
        me_resp = client.get("/auth/me")
        assert me_resp.status_code == status.HTTP_200_OK
        assert me_resp.json()["is_guest"] is False
        assert me_resp.json()["email"] == "converted@example.com"
        assert me_resp.json()["full_name"] == "Converted User"

    def test_guest_convert_unauthenticated(self, client):
        """POST /auth/guest/convert should return 401 without auth."""
        response = client.post(
            self.CONVERT_URL,
            json={
                "email": "test@example.com",
                "password": "StrongPass1",
                "full_name": "Test",
            },
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_guest_convert_non_guest_fails(self, client):
        """A non-guest user cannot use the convert endpoint."""
        # Register a normal user
        client.post(
            "/auth/register",
            json={"email": "normal@example.com", "password": "Password123", "full_name": "Normal"},
        )

        response = client.post(
            self.CONVERT_URL,
            json={
                "email": "normal@example.com",
                "password": "Password1234",
                "full_name": "Changed",
            },
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "already a full user" in data["detail"]

    def test_guest_login_with_csrf_enabled(self, client, monkeypatch):
        """Guest login should work even with CSRF enabled (exempt path)."""
        monkeypatch.setattr("app.core.config.settings.DISABLE_CSRF", False)
        response = client.post(self.GUEST_URL)
        assert response.status_code == status.HTTP_201_CREATED, \
            f"Guest login with CSRF enabled should work, got {response.status_code}: {response.text}"

    def test_guest_convert_with_csrf_enabled(self, client, monkeypatch):
        """Guest convert should work even with CSRF enabled (exempt path)."""
        monkeypatch.setattr("app.core.config.settings.DISABLE_CSRF", False)
        # Create guest
        guest_resp = client.post(self.GUEST_URL)
        assert guest_resp.status_code == status.HTTP_201_CREATED
        # Convert
        response = client.post(
            self.CONVERT_URL,
            json={
                "email": "csrf-convert@example.com",
                "password": "StrongPass1",
                "full_name": "CSRF Convert",
            },
        )
        assert response.status_code == status.HTTP_200_OK, \
            f"Guest convert with CSRF enabled should work, got {response.status_code}: {response.text}"

