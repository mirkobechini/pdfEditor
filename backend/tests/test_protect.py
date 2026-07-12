"""Tests for PDF protect endpoint."""

import fitz
from fastapi import status


def _make_protected_pdf(password: str = "Test1234") -> bytes:
    """Generate a minimal password-protected PDF using PyMuPDF."""
    doc = fitz.open()
    doc.insert_page(-1, width=612, height=792)
    data = doc.tobytes(encryption=fitz.PDF_ENCRYPT_AES_256, user_pw=password)
    doc.close()
    return data


class TestProtect:
    """Test suite for POST /pdfs/{pdf_id}/protect."""

    UPLOAD_URL = "/pdfs/upload"

    def _upload_and_get_id(self, client, headers, content: bytes, filename: str = "test.pdf"):
        """Upload a PDF and return its ID."""
        resp = client.post(
            self.UPLOAD_URL,
            headers=headers,
            files={"file": (filename, content, "application/pdf")},
        )
        assert resp.status_code == status.HTTP_201_CREATED, f"Upload failed: {resp.text}"
        return resp.json()["id"]

    def test_protect_success(self, client, free_headers, sample_pdf_content):
        """Protect an unprotected PDF should return 200 with is_password_protected=True."""
        pdf_id = self._upload_and_get_id(client, free_headers, sample_pdf_content)

        response = client.post(
            f"/pdfs/{pdf_id}/protect",
            headers=free_headers,
            json={"password": "NewPassword123"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == pdf_id
        assert data["is_password_protected"] is True

    def test_protect_already_protected(self, client, free_headers):
        """Protect an already protected PDF requires unlock first — should return 400."""
        protected_content = _make_protected_pdf("oldpass")
        pdf_id = self._upload_and_get_id(client, free_headers, protected_content)

        # Without unlock, we can't read the PDF content → protect fails
        response = client.post(
            f"/pdfs/{pdf_id}/protect",
            headers=free_headers,
            json={"password": "NewPass123"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_protect_after_unlock(self, client, free_headers):
        """Unlock then protect an already protected PDF should succeed (re-encrypt)."""
        protected_content = _make_protected_pdf("oldpass")
        pdf_id = self._upload_and_get_id(client, free_headers, protected_content)

        # First unlock
        unlock_resp = client.post(
            f"/pdfs/{pdf_id}/unlock",
            headers=free_headers,
            json={"password": "oldpass"},
        )
        assert unlock_resp.status_code == status.HTTP_200_OK

        # Then protect with new password
        response = client.post(
            f"/pdfs/{pdf_id}/protect",
            headers=free_headers,
            json={"password": "NewPass123"},
        )
        assert response.status_code == status.HTTP_200_OK

    def test_protect_empty_password(self, client, free_headers, sample_pdf_content):
        """Protect with empty password should return 400."""
        pdf_id = self._upload_and_get_id(client, free_headers, sample_pdf_content)

        response = client.post(
            f"/pdfs/{pdf_id}/protect",
            headers=free_headers,
            json={"password": ""},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_protect_unauthorized(self, client, sample_pdf_content):
        """Protect without token should return 401."""
        response = client.post(
            "/pdfs/fake-id/protect",
            json={"password": "Test1234"},
        )
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_protect_pdf_not_found(self, client, free_headers):
        """Protect a non-existent PDF should return 400."""
        response = client.post(
            "/pdfs/nonexistent-id/protect",
            headers=free_headers,
            json={"password": "Test1234"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
