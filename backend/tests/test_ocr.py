"""Tests for PDF OCR endpoint (mocked tesseract)."""

from unittest.mock import patch

import fitz
from fastapi import status


def _make_scanned_pdf() -> bytes:
    """Generate a PDF with an image but no text layer (scanned-like)."""
    doc = fitz.open()
    page = doc.new_page(width=300, height=300)
    # Draw a rectangle to simulate a scanned image (no text)
    page.draw_rect(fitz.Rect(50, 50, 250, 250), color=(0, 0, 0), fill=(0.5, 0.5, 0.5))
    data = doc.tobytes()
    doc.close()
    return data


def _make_text_pdf() -> bytes:
    """Generate a PDF with a real text layer."""
    doc = fitz.open()
    page = doc.new_page(width=300, height=300)
    page.insert_text((50, 100), "Already has text")
    data = doc.tobytes()
    doc.close()
    return data


class TestOcr:
    """Test suite for POST /pdfs/{pdf_id}/ocr."""

    UPLOAD_URL = "/pdfs/upload"

    def _upload(self, client, headers, content: bytes, filename: str = "scan.pdf"):
        resp = client.post(
            self.UPLOAD_URL,
            headers=headers,
            files={"file": (filename, content, "application/pdf")},
        )
        assert resp.status_code == status.HTTP_201_CREATED, f"Upload failed: {resp.text}"
        return resp.json()["id"]

    def test_ocr_scanned_pdf(self, client, pro_headers):
        pdf_id = self._upload(client, pro_headers, _make_scanned_pdf())
        with patch("pytesseract.image_to_string", return_value="Recognized text"), patch(
            "app.core.tesseract.configure_tesseract", return_value="/fake/tesseract"
        ):
            resp = client.post(
                f"/pdfs/{pdf_id}/ocr",
                json={"language": "eng"},
                headers=pro_headers,
            )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["pdf"]["id"] == pdf_id
        assert resp.json()["character_count"] == len("Recognized text")
        assert resp.json()["already_searchable"] is False

    def test_ocr_pdf_with_text_returns_unchanged(self, client, pro_headers):
        pdf_id = self._upload(client, pro_headers, _make_text_pdf())
        with patch("pytesseract.image_to_string") as mock_ocr:
            resp = client.post(
                f"/pdfs/{pdf_id}/ocr",
                json={},
                headers=pro_headers,
            )
        assert resp.status_code == status.HTTP_200_OK
        # Tesseract should NOT be called since the PDF already has text
        mock_ocr.assert_not_called()
        assert resp.json()["already_searchable"] is True
        assert resp.json()["character_count"] == 0

    def test_ocr_requires_pro_tier(self, client, free_headers):
        from app.core.config import settings

        pdf_id = self._upload(client, free_headers, _make_scanned_pdf())
        with patch.object(settings, "DISABLE_LICENSE_ENFORCEMENT", False):
            resp = client.post(
                f"/pdfs/{pdf_id}/ocr",
                json={},
                headers=free_headers,
            )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_ocr_pdf_not_found(self, client, pro_headers):
        resp = client.post(
            "/pdfs/nonexistent/ocr",
            json={},
            headers=pro_headers,
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_ocr_produces_searchable_pdf(self, client, pro_headers):
        pdf_id = self._upload(client, pro_headers, _make_scanned_pdf())
        with patch("pytesseract.image_to_string", return_value="Hello OCR world"), patch(
            "app.core.tesseract.configure_tesseract", return_value="/fake/tesseract"
        ):
            resp = client.post(
                f"/pdfs/{pdf_id}/ocr",
                json={},
                headers=pro_headers,
            )
        assert resp.status_code == status.HTTP_200_OK

        # Download and verify the text layer was added
        dl = client.get(f"/pdfs/{pdf_id}/download", headers=pro_headers)
        assert dl.status_code == status.HTTP_200_OK
        doc = fitz.open(stream=dl.content, filetype="pdf")
        text = doc[0].get_text()
        assert "Hello OCR world" in text
        doc.close()

    def test_ocr_returns_503_when_tesseract_binary_missing(self, client, pro_headers):
        """When the `tesseract` binary is not installed, configure_tesseract()
        returns None and the service raises OcrUnavailableError. The API must
        return a clear 503 instead of an unhandled 500."""
        pdf_id = self._upload(client, pro_headers, _make_scanned_pdf())
        with patch("app.core.tesseract.configure_tesseract", return_value=None):
            resp = client.post(
                f"/pdfs/{pdf_id}/ocr",
                json={},
                headers=pro_headers,
            )
        assert resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert resp.json()["detail"]["code"] == "OCR_UNAVAILABLE"

    def test_ocr_passes_pil_image_to_pytesseract(self, client, pro_headers):
        """pytesseract needs a PIL Image (not raw bytes). Verify the service
        converts the rendered page to a PIL Image before calling OCR."""
        from PIL import Image

        pdf_id = self._upload(client, pro_headers, _make_scanned_pdf())
        with patch("pytesseract.image_to_string", return_value="text") as mock_ocr, patch(
            "app.core.tesseract.configure_tesseract", return_value="/fake/tesseract"
        ):
            resp = client.post(
                f"/pdfs/{pdf_id}/ocr",
                json={},
                headers=pro_headers,
            )
        assert resp.status_code == status.HTTP_200_OK
        # The first positional arg passed to pytesseract must be a PIL Image
        first_arg = mock_ocr.call_args[0][0]
        assert isinstance(first_arg, Image.Image)