"""Tests for bug reporting API endpoints."""

from fastapi import status


def _login(client, email="bug@test.com", password="TestPass123"):
    """Register and login a test user."""
    client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": "Bug Reporter"},
    )
    resp = client.post("/auth/login", json={"email": email, "password": password})
    return resp.json()["access_token"]


def _admin_login(client, db_engine):
    """Create admin and login."""
    client.post(
        "/auth/register",
        json={"email": "admin@bugs.com", "password": "Admin1234", "full_name": "Bug Admin"},
    )
    resp = client.post("/auth/login", json={"email": "admin@bugs.com", "password": "Admin1234"})
    token = resp.json()["access_token"]

    # Promote to admin
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    from sqlalchemy import text
    with db_engine.connect() as conn:
        conn.execute(text("UPDATE users SET is_admin = 1 WHERE id = :uid"), {"uid": me.json()["id"]})
        conn.commit()

    return client.post("/auth/login", json={"email": "admin@bugs.com", "password": "Admin1234"}).json()["access_token"]


class TestCreateBug:
    """Test suite for POST /bugs."""

    def test_create_bug(self, client):
        """Should create a bug report."""
        token = _login(client)

        response = client.post(
            "/bugs",
            headers={"Authorization": f"Bearer {token}"},
            json={"title": "Bug found", "description": "Something broke"},
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["title"] == "Bug found"
        assert data["status"] == "open"

    def test_create_bug_with_url(self, client):
        """Should create a bug report with page URL."""
        token = _login(client)

        response = client.post(
            "/bugs",
            headers={"Authorization": f"Bearer {token}"},
            json={"title": "UI bug", "description": "Button broken", "page_url": "/editor"},
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["page_url"] == "/editor"

    def test_create_bug_with_platform_info(self, client):
        """Should create a bug report with platform, app_version, os_info."""
        token = _login(client)

        response = client.post(
            "/bugs",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "title": "Platform bug",
                "description": "Something broke",
                "platform": "web",
                "app_version": "1.0.0",
                "os_info": "Windows 10",
            },
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["platform"] == "web"
        assert data["app_version"] == "1.0.0"
        assert data["os_info"] == "Windows 10"

    def test_create_bug_unauthorized(self, client):
        """Should reject bug report without auth."""
        response = client.post(
            "/bugs",
            json={"title": "Bug", "description": "Broken"},
        )
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


class TestAdminBugs:
    """Test suite for admin bug endpoints."""

    def test_list_bugs_admin(self, client, db_engine):
        """Should list bug reports as admin."""
        token = _admin_login(client, db_engine)

        response = client.get(
            "/admin/bugs",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == status.HTTP_200_OK

    def test_list_bugs_denied(self, client):
        """Should deny non-admin users."""
        token = _login(client)

        response = client.get(
            "/admin/bugs",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_bug_status(self, client, db_engine):
        """Should update bug report status as admin."""
        # Create a bug as normal user
        user_token = _login(client)
        create_resp = client.post(
            "/bugs",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"title": "Bug", "description": "Fix me"},
        )
        bug_id = create_resp.json()["id"]

        # Update status as admin
        admin_token = _admin_login(client, db_engine)
        response = client.put(
            f"/admin/bugs/{bug_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "in_progress"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "in_progress"

    def test_update_bug_invalid_status(self, client, db_engine):
        """Should reject invalid status."""
        admin_token = _admin_login(client, db_engine)

        response = client.put(
            "/admin/bugs/fake-id/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "invalid"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST