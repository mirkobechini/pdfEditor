"""Tests for PDF conversion API endpoints."""

import pytest
from fastapi import status


class TestExport:
    """Test suite for PDF export endpoint."""

    def upload_pdf(self, client, headers):
        resp = client.post(
            "/pdfs/upload",
            headers=headers,
            files={"file": ("test.pdf", self._make_pdf(), "application/pdf")},
        )
        return resp.json()["id"]

    def _make_pdf(self):
        import fitz

        doc = fitz.open()
        doc.insert_page(-1, width=612, height=792)
        data = doc.tobytes()
        doc.close()
        return data

    def test_export_txt(self, client, pro_headers):
        """Should export PDF to text."""
        doc_id = self.upload_pdf(client, pro_headers)

        response = client.post(f"/pdfs/{doc_id}/export?fmt=txt", headers=pro_headers)
        assert response.status_code == status.HTTP_200_OK
        assert "text/plain" in response.headers["content-type"]

    def test_export_png(self, client, pro_headers):
        """Should export PDF to PNG image."""
        doc_id = self.upload_pdf(client, pro_headers)

        response = client.post(f"/pdfs/{doc_id}/export?fmt=png", headers=pro_headers)
        assert response.status_code == status.HTTP_200_OK
        assert "image/png" in response.headers["content-type"]

    def test_export_jpg(self, client, pro_headers):
        """Should export PDF to JPEG image."""
        doc_id = self.upload_pdf(client, pro_headers)

        response = client.post(f"/pdfs/{doc_id}/export?fmt=jpg", headers=pro_headers)
        assert response.status_code == status.HTTP_200_OK
        assert "image/jpeg" in response.headers["content-type"]

    def test_export_invalid_format(self, client, pro_headers):
        """Should reject unsupported export format."""
        doc_id = self.upload_pdf(client, pro_headers)

        response = client.post(f"/pdfs/{doc_id}/export?fmt=docx", headers=pro_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_export_non_existent(self, client, pro_headers):
        """Should reject export for non-existent PDF."""
        response = client.post("/pdfs/fake-id/export?fmt=txt", headers=pro_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestImport:
    """Test suite for PDF import endpoint."""

    def test_import_txt(self, client, pro_headers):
        """Should import a text file as PDF."""
        response = client.post(
            "/pdfs/import",
            headers=pro_headers,
            files={"file": ("hello.txt", b"Hello World", "text/plain")},
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["original_filename"] == "hello.txt"
        assert data["page_count"] >= 1

    def test_import_jpg(self, client, enterprise_headers):
        """Should import a real JPG image and convert it to PDF.

        Regression test: image documents must be converted with
        convert_to_pdf(), not tobytes()/save() which raises AssertionError.

        Image import is enterprise-only (see license_seed.py) — pro_headers
        would 403 before ever reaching the conversion code being tested here.
        """
        import io

        try:
            from PIL import Image
        except ImportError:
            pytest.skip("Pillow not installed")

        buf = io.BytesIO()
        Image.new("RGB", (200, 100), color="blue").save(buf, format="JPEG")
        response = client.post(
            "/pdfs/import",
            headers=enterprise_headers,
            files={"file": ("photo.jpg", buf.getvalue(), "image/jpeg")},
        )
        assert response.status_code == status.HTTP_201_CREATED, response.text
        data = response.json()
        assert data["original_filename"] == "photo.jpg"
        assert data["page_count"] == 1
        assert data["file_size"] > 0

    def test_import_jpg_requires_enterprise_tier(self, client, pro_headers, monkeypatch):
        """Pro tier does not include import_images (enterprise-only feature).

        License enforcement is off by default (tier system still being
        designed — see LESSONS_LEARNED.md), so this must force it on to
        actually exercise the gating behavior being tested.
        """
        from app.core.config import settings
        monkeypatch.setattr(settings, "DISABLE_LICENSE_ENFORCEMENT", False)
        import io

        try:
            from PIL import Image
        except ImportError:
            pytest.skip("Pillow not installed")

        buf = io.BytesIO()
        Image.new("RGB", (200, 100), color="blue").save(buf, format="JPEG")
        response = client.post(
            "/pdfs/import",
            headers=pro_headers,
            files={"file": ("photo.jpg", buf.getvalue(), "image/jpeg")},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_import_invalid_format(self, client, pro_headers):
        """Should reject unsupported file format."""
        response = client.post(
            "/pdfs/import",
            headers=pro_headers,
            files={"file": ("doc.xlsx", b"fake xlsx content", "application/octet-stream")},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.parametrize("fmt,ext,mime", [
        ("PNG", "png", "image/png"),
        ("GIF", "gif", "image/gif"),
        ("BMP", "bmp", "image/bmp"),
    ])
    def test_import_image_formats(self, client, enterprise_headers, fmt, ext, mime):
        """Should import PNG/GIF/BMP images and convert them to PDF.

        Regression test: PyMuPDF does not reliably open GIF/BMP streams
        directly. Images are normalized to PNG via Pillow first.

        Image import is enterprise-only (see license_seed.py) — pro_headers
        would 403 before ever reaching the conversion code being tested here.
        """
        import io

        try:
            from PIL import Image
        except ImportError:
            pytest.skip("Pillow not installed")

        buf = io.BytesIO()
        Image.new("RGB", (120, 80), color="red").save(buf, format=fmt)
        response = client.post(
            "/pdfs/import",
            headers=enterprise_headers,
            files={"file": (f"photo.{ext}", buf.getvalue(), mime)},
        )
        assert response.status_code == status.HTTP_201_CREATED, response.text
        data = response.json()
        assert data["original_filename"] == f"photo.{ext}"
        assert data["page_count"] == 1
        assert data["file_size"] > 0

    def test_import_no_filename(self, client, pro_headers):
        """Should reject file without filename."""
        response = client.post(
            "/pdfs/import",
            headers=pro_headers,
            files={"file": ("", b"content", "text/plain")},
        )
        assert response.status_code in (status.HTTP_400_BAD_REQUEST, 422)

    # ------------------------------------------------------------------
    # Parametrized import tests — one per format (TXT only, images need
    # real files — covered by import_txt test above)
    # ------------------------------------------------------------------

    @pytest.mark.parametrize("filename,content,content_type", [
        ("hello.txt", b"Hello World", "text/plain"),
        ("hello2.txt", b"Another text", "text/plain"),
    ])
    def test_import_parametrized(self, client, pro_headers, filename, content, content_type):
        """Should import TXT files without license blocking."""
        response = client.post(
            "/pdfs/import",
            headers=pro_headers,
            files={"file": (filename, content, content_type)},
        )
        assert response.status_code == status.HTTP_201_CREATED, f"Failed for {filename}: {response.text}"

    # ------------------------------------------------------------------
    # MIME type validation tests
    # Note: for image formats, MIME validation comes AFTER license check,
    # so with pro_headers we get 403 before reaching MIME validation.
    # Only TXT (which passes license check for pro) can test MIME rejection.
    # ------------------------------------------------------------------

    @pytest.mark.parametrize("filename,content,content_type", [
        ("hello.txt", b"Hello", "application/octet-stream"),
    ])
    def test_import_wrong_mime(self, client, pro_headers, filename, content, content_type):
        """Should reject files with wrong MIME type for their extension."""
        response = client.post(
            "/pdfs/import",
            headers=pro_headers,
            files={"file": (filename, content, content_type)},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid content type" in response.text

    # ------------------------------------------------------------------
    # File size validation test
    # ------------------------------------------------------------------

    def test_import_file_too_large(self, client, pro_headers):
        """Should reject files larger than MAX_UPLOAD_SIZE_MB."""
        from app.core.config import settings
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        large_content = b"x" * (max_bytes + 1)

        response = client.post(
            "/pdfs/import",
            headers=pro_headers,
            files={"file": ("large.txt", large_content, "text/plain")},
        )
        assert response.status_code == 413
        assert "File too large" in response.text

    # ------------------------------------------------------------------
    # DOCX import tests
    # ------------------------------------------------------------------

    @staticmethod
    def _make_docx(text: str = "Hello DOCX World") -> bytes:
        """Create a minimal valid DOCX file in memory."""
        from io import BytesIO
        from docx import Document

        doc = Document()
        doc.add_paragraph(text)
        buffer = BytesIO()
        doc.save(buffer)
        return buffer.getvalue()

    def test_import_docx(self, client, pro_headers):
        """Should import a DOCX file as PDF."""
        docx_bytes = self._make_docx()
        response = client.post(
            "/pdfs/import",
            headers=pro_headers,
            files={"file": ("doc.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )
        assert response.status_code == status.HTTP_201_CREATED, response.text
        data = response.json()
        assert data["original_filename"] == "doc.docx"
        assert data["page_count"] >= 1

    def test_import_docx_multiple_paragraphs(self, client, pro_headers):
        """Should import a DOCX with multiple paragraphs."""
        docx_bytes = self._make_docx("First paragraph\nSecond paragraph\nThird paragraph")
        response = client.post(
            "/pdfs/import",
            headers=pro_headers,
            files={"file": ("multi.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )
        assert response.status_code == status.HTTP_201_CREATED, response.text
        data = response.json()
        assert data["page_count"] >= 1

    def test_import_docx_invalid_content(self, client, pro_headers):
        """Should reject a DOCX with invalid content."""
        response = client.post(
            "/pdfs/import",
            headers=pro_headers,
            files={"file": ("bad.docx", b"not a real docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST