"""Tests for edge cases across multiple modules."""

import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi import status
from sqlalchemy import create_engine, inspect

from app.core.config import settings
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.main import app as fastapi_app

class TestBugReportEdgeCases:
    """Test bug_report.py edge cases."""

    def test_update_bug_status_not_found_as_admin(self, client, db_engine):
        """Should return 404 when updating non-existent bug as admin."""
        from tests.test_bug_report import _admin_login
        admin_token = _admin_login(client, db_engine)

        response = client.put(
            "/admin/bugs/non-existent-id/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "closed"},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_bug_status_denied_for_non_admin(self, client):
        """Should return 403 when non-admin tries to update status."""
        from tests.test_bug_report import _login
        token = _login(client, email="nonadmin@bugs.com")

        response = client.put(
            "/admin/bugs/some-id/status",
            headers={"Authorization": f"Bearer {token}"},
            json={"status": "closed"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

class TestAdminEdgeCases:
    """Test admin.py edge cases."""

    def test_update_license_user_not_found(self, client, db_engine):
        """Should return 404 when updating license for non-existent user."""
        from tests.test_bug_report import _admin_login
        admin_token = _admin_login(client, db_engine)

        response = client.put(
            "/admin/users/non-existent-id/license",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"license_tier": "lifetime"},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_admin_send_reset_fails_gracefully(self, client, db_engine):
        """Should handle failed token generation gracefully."""
        from tests.test_bug_report import _admin_login
        admin_token = _admin_login(client, db_engine)

        # Register a target user
        client.post(
            "/auth/register",
            json={"email": "reset_target@test.com", "password": "Target1234", "full_name": "Target"},
        )
        target_resp = client.post("/auth/login", json={"email": "reset_target@test.com", "password": "Target1234"})
        me = client.get("/auth/me", headers={"Authorization": f"Bearer {target_resp.json()['access_token']}"})
        target_id = me.json()["id"]

        response = client.post(
            f"/admin/users/{target_id}/send-reset",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        # Should succeed (SMTP not configured = dev mode)
        assert response.status_code == status.HTTP_200_OK

    def test_list_license_features(self, client, free_headers):
        """Should list license features for current user."""
        response = client.get("/licenses/features", headers=free_headers)
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)

