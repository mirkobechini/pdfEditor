"""Tests for PDF unlock endpoint."""

import fitz
from fastapi import status


def _make_protected_pdf(password: str = "test123") -> bytes:
    """Generate a minimal password-protected PDF using PyMuPDF."""
    import fitz
    doc = fitz.open()
    doc.insert_page(-1, width=612, height=792)
    data = doc.tobytes(encryption=fitz.PDF_ENCRYPT_AES_256, user_pw=password)
    doc.close()
    return data


class TestUnlock:
    """Test suite for POST /pdfs/{pdf_id}/unlock."""

    UPLOAD_URL = "/pdfs/upload"
    UNLOCK_URL = "/pdfs/{pdf_id}/unlock"

    def _upload_and_get_id(self, client, headers, content: bytes, filename: str = "test.pdf"):
        """Upload a PDF and return its ID."""
        resp = client.post(
            self.UPLOAD_URL,
            headers=headers,
            files={"file": (filename, content, "application/pdf")},
        )
        assert resp.status_code == status.HTTP_201_CREATED, f"Upload failed: {resp.text}"
        return resp.json()["id"]

    def test_unlock_not_protected(self, client, free_headers, sample_pdf_content):
        """Unlock on a non-protected PDF should succeed (no-op)."""
        pdf_id = self._upload_and_get_id(client, free_headers, sample_pdf_content)

        response = client.post(
            f"/pdfs/{pdf_id}/unlock",
            headers=free_headers,
            json={"password": "any_password"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == pdf_id
        assert data["is_password_protected"] is False

    def test_unlock_success(self, client, free_headers):
        """Unlock a protected PDF with correct password."""
        protected_content = _make_protected_pdf("test123")
        pdf_id = self._upload_and_get_id(client, free_headers, protected_content)

        response = client.post(
            f"/pdfs/{pdf_id}/unlock",
            headers=free_headers,
            json={"password": "test123"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == pdf_id
        # is_password_protected stays True in DB; the unlock authenticates in-memory
        # The important thing is that the endpoint returns 200

    def test_unlock_wrong_password(self, client, free_headers):
        """Unlock a protected PDF with wrong password should return 403."""
        protected_content = _make_protected_pdf("test123")
        pdf_id = self._upload_and_get_id(client, free_headers, protected_content)

        response = client.post(
            f"/pdfs/{pdf_id}/unlock",
            headers=free_headers,
            json={"password": "wrong_password"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Incorrect password" in response.text

    def test_unlock_empty_password_protected(self, client, free_headers):
        """Unlock a protected PDF with empty password should return 400 (endpoint check)."""
        protected_content = _make_protected_pdf("test123")
        pdf_id = self._upload_and_get_id(client, free_headers, protected_content)

        response = client.post(
            f"/pdfs/{pdf_id}/unlock",
            headers=free_headers,
            json={"password": ""},
        )
        # Endpoint checks empty password before reaching service → 400
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unlock_unauthorized(self, client, free_headers, sample_pdf_content):
        """Unlock without auth token should return 401."""
        # Upload first with auth
        pdf_id = self._upload_and_get_id(client, free_headers, sample_pdf_content)

        # Call unlock without auth headers
        response = client.post(
            f"/pdfs/{pdf_id}/unlock",
            json={"password": "test123"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unlock_empty_password_request(self, client, free_headers, sample_pdf_content):
        """Unlock with empty password should return 400 (endpoint check happens first)."""
        pdf_id = self._upload_and_get_id(client, free_headers, sample_pdf_content)

        response = client.post(
            f"/pdfs/{pdf_id}/unlock",
            headers=free_headers,
            json={"password": ""},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Password cannot be empty" in response.text