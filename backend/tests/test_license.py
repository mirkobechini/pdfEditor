"""Tests for licensing API endpoints."""

from fastapi import status


def _register_and_login(client, email="user@test.com", password="pass123"):
    """Helper: register and login a normal user."""
    client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": "User"},
    )
    resp = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    return resp.json()["access_token"]


def _create_admin(client, db_engine):
    """Helper: register a user and promote to admin via the test DB."""
    client.post(
        "/auth/register",
        json={"email": "admin@test.com", "password": "admin123", "full_name": "Admin"},
    )

    resp = client.post(
        "/auth/login",
        json={"email": "admin@test.com", "password": "admin123"},
    )
    token = resp.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    user_id = me.json()["id"]

    from sqlalchemy import text

    with db_engine.connect() as conn:
        conn.execute(
            text("UPDATE users SET is_admin = 1 WHERE id = :uid"),
            {"uid": user_id},
        )
        conn.commit()

    return token


class TestLicenses:
    """Test suite for license features endpoint."""

    def test_get_features_free(self, client):
        """Should return features for free tier."""
        token = _register_and_login(client)

        response = client.get(
            "/licenses/features",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) > 0
        # Free tier should have at least upload_pdf and download_pdf
        keys = [f["feature_key"] for f in data]
        assert "upload_pdf" in keys
        assert "download_pdf" in keys


class TestAdmin:
    """Test suite for admin endpoints."""

    def test_admin_list_users(self, client, db_engine):
        """Should list users for admin."""
        token = _create_admin(client, db_engine)

        response = client.get(
            "/admin/users",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) >= 1

    def test_admin_list_users_denied(self, client, db_engine):
        """Should deny non-admin users."""
        token = _register_and_login(client)

        response = client.get(
            "/admin/users",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_update_license(self, client, db_engine):
        """Should update user license tier."""
        admin_token = _create_admin(client, db_engine)
        user_token = _register_and_login(client, email="target@test.com")

        # Get users list to find target ID
        users_resp = client.get(
            "/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        target_id = [u["id"] for u in users_resp.json()["items"] if u["email"] == "target@test.com"][0]

        response = client.put(
            f"/admin/users/{target_id}/license",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"license_tier": "lifetime"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["license_tier"] == "lifetime"

    def test_admin_update_license_invalid_tier(self, client, db_engine):
        """Should reject invalid tier."""
        admin_token = _create_admin(client, db_engine)

        users_resp = client.get(
            "/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        target_id = users_resp.json()["items"][0]["id"]

        response = client.put(
            f"/admin/users/{target_id}/license",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"license_tier": "pro"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Admin can only assign" in response.json()["detail"]

    def test_admin_update_is_admin(self, client, db_engine):
        """Should promote a user to admin."""
        admin_token = _create_admin(client, db_engine)
        user_token = _register_and_login(client, email="target@test.com")

        # Find target user ID
        users_resp = client.get(
            "/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        target_id = [u["id"] for u in users_resp.json()["items"] if u["email"] == "target@test.com"][0]

        # Promote to admin
        response = client.put(
            f"/admin/users/{target_id}/admin",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_admin": True},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["is_admin"] is True

        # Demote back
        response = client.put(
            f"/admin/users/{target_id}/admin",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_admin": False},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["is_admin"] is False

    def test_admin_update_is_admin_denied_for_non_admin(self, client, db_engine):
        """Should deny non-admin users from promoting others."""
        user_token = _register_and_login(client, email="user@test.com")
        admin_token = _create_admin(client, db_engine)

        users_resp = client.get(
            "/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        # Get any user ID
        target_id = users_resp.json()["items"][0]["id"]

        response = client.put(
            f"/admin/users/{target_id}/admin",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"is_admin": True},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_update_is_admin_not_found(self, client, db_engine):
        """Should return 404 for non-existent user."""
        admin_token = _create_admin(client, db_engine)

        response = client.put(
            "/admin/users/non-existent-id/admin",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_admin": True},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND