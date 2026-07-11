"""Tests for license enforcement on PDF endpoints."""

import pytest
from unittest.mock import patch

from fastapi import status

from app.core.config import settings


@pytest.fixture(autouse=True)
def _enable_enforcement():
    """Force license enforcement ON for all tests in this class, regardless of .env."""
    with patch.object(settings, "DISABLE_LICENSE_ENFORCEMENT", False):
        yield


def _register_and_login(client, email="user@test.com", password="TestPass123"):
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
        json={"email": "admin@test.com", "password": "Admin1234", "full_name": "Admin"},
    )

    resp = client.post(
        "/auth/login",
        json={"email": "admin@test.com", "password": "Admin1234"},
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


def _create_pro_user(client, db_engine):
    """Helper: register a user and promote to pro tier via the test DB."""
    client.post(
        "/auth/register",
        json={"email": "pro@test.com", "password": "ProPass123", "full_name": "Pro User"},
    )

    resp = client.post(
        "/auth/login",
        json={"email": "pro@test.com", "password": "ProPass123"},
    )
    token = resp.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    user_id = me.json()["id"]

    from sqlalchemy import text

    with db_engine.connect() as conn:
        conn.execute(
            text("UPDATE users SET license_tier = 'pro' WHERE id = :uid"),
            {"uid": user_id},
        )
        conn.commit()

    return token


def _upload_pdf(client, token, content: bytes) -> str:
    """Helper: upload a PDF and return its ID."""
    resp = client.post(
        "/pdfs/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("test.pdf", content, "application/pdf")},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


class TestLicenseEnforcement:
    """Verify that free users are blocked from premium endpoints."""

    def test_free_user_blocked_from_merge(self, client, sample_pdf_content):
        """Free user should get 403 on merge."""
        token = _register_and_login(client)
        resp = client.post(
            "/pdfs/merge",
            headers={"Authorization": f"Bearer {token}"},
            json={"pdf_ids": ["a", "b"]},
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        assert "merge_pdf" in resp.json()["detail"]

    def test_free_user_blocked_from_split(self, client, sample_pdf_content):
        """Free user should get 403 on split."""
        token = _register_and_login(client)
        pdf_id = _upload_pdf(client, token, sample_pdf_content)

        resp = client.post(
            f"/pdfs/{pdf_id}/split",
            headers={"Authorization": f"Bearer {token}"},
            json={"mode": "every"},
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        assert "split_pdf" in resp.json()["detail"]

    def test_free_user_blocked_from_reorder(self, client, sample_pdf_content):
        """Free user should get 403 on reorder."""
        token = _register_and_login(client)
        pdf_id = _upload_pdf(client, token, sample_pdf_content)

        resp = client.post(
            f"/pdfs/{pdf_id}/reorder",
            headers={"Authorization": f"Bearer {token}"},
            json={"page_order": [1]},
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        assert "reorder_pages" in resp.json()["detail"]

    def test_free_user_blocked_from_remove_pages(self, client, sample_pdf_content):
        """Free user should get 403 on remove-pages."""
        token = _register_and_login(client)
        pdf_id = _upload_pdf(client, token, sample_pdf_content)

        resp = client.post(
            f"/pdfs/{pdf_id}/remove-pages",
            headers={"Authorization": f"Bearer {token}"},
            json={"page_numbers": [1]},
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        assert "remove_pages" in resp.json()["detail"]

    def test_free_user_blocked_from_replace_text(self, client, sample_pdf_content):
        """Free user should get 403 on replace-text."""
        token = _register_and_login(client)
        pdf_id = _upload_pdf(client, token, sample_pdf_content)

        resp = client.post(
            f"/pdfs/{pdf_id}/replace-text",
            headers={"Authorization": f"Bearer {token}"},
            json={"search": "x", "replace": "y"},
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        assert "replace_text" in resp.json()["detail"]

    def test_free_user_blocked_from_edit_metadata(self, client, sample_pdf_content):
        """Free user should get 403 on metadata update."""
        token = _register_and_login(client)
        pdf_id = _upload_pdf(client, token, sample_pdf_content)

        resp = client.put(
            f"/pdfs/{pdf_id}/metadata",
            headers={"Authorization": f"Bearer {token}"},
            json={"title": "New Title"},
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        assert "edit_metadata" in resp.json()["detail"]

    def test_free_user_allowed_extract_text(self, client, sample_pdf_content):
        """Free user should be allowed to extract text (free feature)."""
        token = _register_and_login(client)
        pdf_id = _upload_pdf(client, token, sample_pdf_content)

        resp = client.get(
            f"/pdfs/{pdf_id}/text",
            headers={"Authorization": f"Bearer {token}"},
        )
        # Should not be 403 — free tier includes extract_text
        assert resp.status_code != status.HTTP_403_FORBIDDEN

    def test_free_user_blocked_from_export_txt(self, client, sample_pdf_content):
        """Free user should get 403 on export txt."""
        token = _register_and_login(client)
        pdf_id = _upload_pdf(client, token, sample_pdf_content)

        resp = client.post(
            f"/pdfs/{pdf_id}/export",
            headers={"Authorization": f"Bearer {token}"},
            params={"fmt": "txt"},
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        assert "export_txt" in resp.json()["detail"]

    def test_pro_user_allowed_merge(self, client, db_engine, sample_pdf_content):
        """Pro user should be allowed to merge."""
        token = _create_pro_user(client, db_engine)

        resp = client.post(
            "/pdfs/merge",
            headers={"Authorization": f"Bearer {token}"},
            json={"pdf_ids": ["a", "b"]},
        )
        # Should be 400 (invalid IDs) not 403 — license allows it
        assert resp.status_code != status.HTTP_403_FORBIDDEN

    def test_admin_bypasses_all_checks(self, client, db_engine, sample_pdf_content):
        """Admin should bypass all license checks."""
        token = _create_admin(client, db_engine)

        resp = client.post(
            "/pdfs/merge",
            headers={"Authorization": f"Bearer {token}"},
            json={"pdf_ids": ["a", "b"]},
        )
        # Should be 400 (invalid IDs) not 403
        assert resp.status_code != status.HTTP_403_FORBIDDEN

    def test_pro_user_allowed_export_txt(self, client, db_engine, sample_pdf_content):
        """Pro user should be allowed to export txt."""
        token = _create_pro_user(client, db_engine)
        pdf_id = _upload_pdf(client, token, sample_pdf_content)

        resp = client.post(
            f"/pdfs/{pdf_id}/export",
            headers={"Authorization": f"Bearer {token}"},
            params={"fmt": "txt"},
        )
        # Not 403 — might be 404 or 200 depending on service
        assert resp.status_code != status.HTTP_403_FORBIDDEN