"""Tests for PDF sign endpoint."""

import base64
from unittest.mock import patch

import fitz
from fastapi import status


def _make_signature_png() -> bytes:
    """Generate a minimal 1x1 PNG signature image using PyMuPDF."""
    doc = fitz.open()
    page = doc.new_page(width=100, height=50)
    page.draw_rect(fitz.Rect(10, 10, 90, 40), color=(0, 0, 0), fill=(0, 0, 0))
    pix = page.get_pixmap(dpi=72)
    png = pix.tobytes("png")
    doc.close()
    return png


class TestSign:
    """Test suite for POST /pdfs/{pdf_id}/sign."""

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

    def _sign(self, client, headers, pdf_id, **overrides):
        """Helper to call the sign endpoint with defaults."""
        payload = {
            "signature_image_b64": base64.b64encode(_make_signature_png()).decode(),
            "page_number": 1,
            "x": 50.0,
            "y": 50.0,
            "width": 200.0,
            "height": 80.0,
        }
        payload.update(overrides)
        return client.post(f"/pdfs/{pdf_id}/sign", headers=headers, json=payload)

    def test_sign_success(self, client, pro_headers, sample_pdf_content):
        """Sign a PDF should return 200 with updated metadata."""
        pdf_id = self._upload_and_get_id(client, pro_headers, sample_pdf_content)

        response = self._sign(client, pro_headers, pdf_id)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == pdf_id
        assert data["page_count"] >= 1

    def test_sign_creates_valid_pdf(self, client, pro_headers, sample_pdf_content):
        """After signing, the downloaded PDF should still be valid and contain the image."""
        pdf_id = self._upload_and_get_id(client, pro_headers, sample_pdf_content)

        response = self._sign(client, pro_headers, pdf_id)
        assert response.status_code == status.HTTP_200_OK

        # Download the signed PDF and verify it's valid
        dl = client.get(f"/pdfs/{pdf_id}/download", headers=pro_headers)
        assert dl.status_code == status.HTTP_200_OK
        doc = fitz.open(stream=dl.content, filetype="pdf")
        assert doc.page_count >= 1
        # The page should now have an image (the signature)
        images = doc[0].get_images()
        assert len(images) >= 1
        doc.close()

    def test_sign_free_tier_forbidden(self, client, free_headers, sample_pdf_content):
        """Free tier should not be able to sign (feature gated)."""
        from app.core.config import settings

        with patch.object(settings, "DISABLE_LICENSE_ENFORCEMENT", False):
            pdf_id = self._upload_and_get_id(client, free_headers, sample_pdf_content)
            response = self._sign(client, free_headers, pdf_id)
            assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_sign_invalid_page(self, client, pro_headers, sample_pdf_content):
        """Signing on an out-of-range page should return 400."""
        pdf_id = self._upload_and_get_id(client, pro_headers, sample_pdf_content)

        response = self._sign(client, pro_headers, pdf_id, page_number=999)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_sign_invalid_base64(self, client, pro_headers, sample_pdf_content):
        """Invalid base64 signature image should return 400."""
        pdf_id = self._upload_and_get_id(client, pro_headers, sample_pdf_content)

        response = self._sign(
            client, pro_headers, pdf_id, signature_image_b64="!!!not-base64!!!"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_sign_empty_image(self, client, pro_headers, sample_pdf_content):
        """Empty signature image should return 400."""
        pdf_id = self._upload_and_get_id(client, pro_headers, sample_pdf_content)

        response = self._sign(client, pro_headers, pdf_id, signature_image_b64="")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_sign_invalid_dimensions(self, client, pro_headers, sample_pdf_content):
        """Non-positive width/height should return 400."""
        pdf_id = self._upload_and_get_id(client, pro_headers, sample_pdf_content)

        response = self._sign(client, pro_headers, pdf_id, width=0, height=80)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_sign_second_page(self, client, pro_headers):
        """Signing on page 2 of a multi-page PDF should work."""
        # Create a 2-page PDF
        doc = fitz.open()
        doc.new_page(width=612, height=792)
        doc.new_page(width=612, height=792)
        content = doc.tobytes()
        doc.close()

        pdf_id = self._upload_and_get_id(client, pro_headers, content)

        response = self._sign(client, pro_headers, pdf_id, page_number=2)
        assert response.status_code == status.HTTP_200_OK

        # Verify the image is on page 2
        dl = client.get(f"/pdfs/{pdf_id}/download", headers=pro_headers)
        doc = fitz.open(stream=dl.content, filetype="pdf")
        assert len(doc[1].get_images()) >= 1
        doc.close()