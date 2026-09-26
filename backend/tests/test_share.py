"""Tests for PDF share link endpoints."""

import fitz
from fastapi import status


def _make_pdf() -> bytes:
    """Generate a minimal valid PDF using PyMuPDF."""
    doc = fitz.open()
    page = doc.new_page(width=200, height=200)
    page.insert_text((50, 100), "Shared PDF test")
    data = doc.tobytes()
    doc.close()
    return data


class TestShare:
    """Test suite for share link endpoints."""

    UPLOAD_URL = "/pdfs/upload"

    def _upload(self, client, headers, content: bytes, filename: str = "shared.pdf"):
        resp = client.post(
            self.UPLOAD_URL,
            headers=headers,
            files={"file": (filename, content, "application/pdf")},
        )
        assert resp.status_code == status.HTTP_201_CREATED, f"Upload failed: {resp.text}"
        return resp.json()["id"]

    def test_create_share_link(self, client, free_headers):
        pdf_id = self._upload(client, free_headers, _make_pdf())
        resp = client.post(f"/pdfs/{pdf_id}/share", json={}, headers=free_headers)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["token"]
        assert data["url"].endswith(f"/share/{data['token']}")
        assert data["has_password"] is False

    def test_create_share_link_with_password(self, client, free_headers):
        pdf_id = self._upload(client, free_headers, _make_pdf())
        resp = client.post(
            f"/pdfs/{pdf_id}/share",
            json={"password": "secret123"},
            headers=free_headers,
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["has_password"] is True

    def test_create_share_link_with_expiry(self, client, free_headers):
        pdf_id = self._upload(client, free_headers, _make_pdf())
        resp = client.post(
            f"/pdfs/{pdf_id}/share",
            json={"expires_in_days": 7},
            headers=free_headers,
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["expires_at"] is not None

    def test_create_share_link_unauthorized(self, client, free_headers):
        # Cannot share a PDF that doesn't exist
        resp = client.post("/pdfs/nonexistent/share", json={}, headers=free_headers)
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_get_share_info_public(self, client, free_headers):
        pdf_id = self._upload(client, free_headers, _make_pdf())
        share = client.post(f"/pdfs/{pdf_id}/share", json={}, headers=free_headers).json()
        token = share["token"]

        resp = client.get(f"/share/{token}")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["filename"] == "shared.pdf"
        assert data["has_password"] is False

    def test_get_share_info_not_found(self, client):
        resp = client.get("/share/nonexistenttoken")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_download_shared_pdf_public(self, client, free_headers):
        pdf_id = self._upload(client, free_headers, _make_pdf())
        share = client.post(f"/pdfs/{pdf_id}/share", json={}, headers=free_headers).json()
        token = share["token"]

        resp = client.post(f"/share/{token}/download", json={})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.headers["content-type"] == "application/pdf"
        assert len(resp.content) > 0

    def test_download_shared_pdf_with_password(self, client, free_headers):
        pdf_id = self._upload(client, free_headers, _make_pdf())
        share = client.post(
            f"/pdfs/{pdf_id}/share",
            json={"password": "secret123"},
            headers=free_headers,
        ).json()
        token = share["token"]

        # Wrong password
        resp = client.post(f"/share/{token}/download", json={"password": "wrong"})
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

        # Correct password
        resp = client.post(f"/share/{token}/download", json={"password": "secret123"})
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.content) > 0

    def test_download_shared_pdf_works_with_csrf_enabled(self, client, free_headers, monkeypatch):
        """Regression: /share/{token}/download is public/unauthenticated, so it
        must be exempt from CSRF validation. CSRF_EXEMPT_PATHS only matches
        exact strings and can't list a path with a dynamic {token} segment,
        so this used to always 403 once CSRF was actually enabled — masked by
        conftest.py disabling CSRF globally for the rest of the test suite."""
        monkeypatch.setattr("app.core.config.settings.DISABLE_CSRF", False)
        pdf_id = self._upload(client, free_headers, _make_pdf())
        share = client.post(f"/pdfs/{pdf_id}/share", json={}, headers=free_headers).json()
        token = share["token"]

        # No CSRF cookie, no X-CSRF-Token header, no auth — exactly how an
        # anonymous visitor's browser calls this endpoint.
        resp = client.post(f"/share/{token}/download", json={})
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.content) > 0

    def test_download_shared_pdf_missing_password(self, client, free_headers):
        pdf_id = self._upload(client, free_headers, _make_pdf())
        share = client.post(
            f"/pdfs/{pdf_id}/share",
            json={"password": "secret123"},
            headers=free_headers,
        ).json()
        token = share["token"]

        resp = client.post(f"/share/{token}/download", json={})
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_revoke_share_link(self, client, free_headers):
        pdf_id = self._upload(client, free_headers, _make_pdf())
        share = client.post(f"/pdfs/{pdf_id}/share", json={}, headers=free_headers).json()
        token = share["token"]

        resp = client.delete(f"/pdfs/{pdf_id}/share/{token}", headers=free_headers)
        assert resp.status_code == status.HTTP_200_OK

        # After revoke, the link is gone
        resp = client.get(f"/share/{token}")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_list_share_links(self, client, free_headers):
        pdf_id = self._upload(client, free_headers, _make_pdf())
        client.post(f"/pdfs/{pdf_id}/share", json={}, headers=free_headers)
        client.post(f"/pdfs/{pdf_id}/share", json={}, headers=free_headers)

        resp = client.get(f"/pdfs/{pdf_id}/shares", headers=free_headers)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.json()) == 2

    def test_cannot_share_others_pdf(self, client, free_headers, pro_headers):
        # free user uploads
        pdf_id = self._upload(client, free_headers, _make_pdf())
        # pro user tries to share it (not owner)
        resp = client.post(f"/pdfs/{pdf_id}/share", json={}, headers=pro_headers)
        assert resp.status_code == status.HTTP_404_NOT_FOUND