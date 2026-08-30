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