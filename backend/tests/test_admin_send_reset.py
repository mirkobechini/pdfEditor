"""Tests for admin send-reset endpoint."""

from fastapi import status


def _admin_login(client, db_engine):
    client.post(
        "/auth/register",
        json={"email": "admin@reset.com", "password": "Admin1234", "full_name": "Admin"},
    )
    resp = client.post("/auth/login", json={"email": "admin@reset.com", "password": "Admin1234"})
    token = resp.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    from sqlalchemy import text
    with db_engine.connect() as conn:
        conn.execute(text("UPDATE users SET is_admin = 1 WHERE id = :uid"), {"uid": me.json()["id"]})
        conn.commit()
    return client.post("/auth/login", json={"email": "admin@reset.com", "password": "Admin1234"}).json()["access_token"]


class TestAdminSendReset:
    """Test suite for POST /admin/users/{user_id}/send-reset."""

    def test_admin_send_reset(self, client, db_engine):
        """Should generate a reset token and return success message."""
        admin_token = _admin_login(client, db_engine)

        # Register a target user
        client.post(
            "/auth/register",
            json={"email": "target@test.com", "password": "Target1234", "full_name": "Target"},
        )
        target_resp = client.post("/auth/login", json={"email": "target@test.com", "password": "Target1234"})
        me = client.get("/auth/me", headers={"Authorization": f"Bearer {target_resp.json()['access_token']}"})
        target_id = me.json()["id"]

        response = client.post(
            f"/admin/users/{target_id}/send-reset",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert "reset token" in response.json()["message"].lower() or "sent" in response.json()["message"].lower()

    def test_admin_send_reset_denied_non_admin(self, client):
        """Should deny non-admin users."""
        client.post(
            "/auth/register",
            json={"email": "user@test.com", "password": "User1234", "full_name": "User"},
        )
        user_resp = client.post("/auth/login", json={"email": "user@test.com", "password": "User1234"})
        token = user_resp.json()["access_token"]

        response = client.post(
            "/admin/users/nonexistent/send-reset",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_send_reset_not_found(self, client, db_engine):
        """Should return 404 for non-existent user."""
        admin_token = _admin_login(client, db_engine)
        response = client.post(
            "/admin/users/fake-id-123/send-reset",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
