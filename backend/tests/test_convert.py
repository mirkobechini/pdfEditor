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

    def test_import_invalid_format(self, client, pro_headers):
        """Should reject unsupported file format."""
        response = client.post(
            "/pdfs/import",
            headers=pro_headers,
            files={"file": ("doc.docx", b"fake docx content", "application/octet-stream")},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_import_no_filename(self, client, pro_headers):
        """Should reject file without filename."""
        response = client.post(
            "/pdfs/import",
            headers=pro_headers,
            files={"file": ("", b"content", "text/plain")},
        )
        assert response.status_code in (status.HTTP_400_BAD_REQUEST, 422)

    # ------------------------------------------------------------------
    # Parametrized import tests — one per supported format
    # ------------------------------------------------------------------

    @pytest.mark.parametrize("filename,content,content_type,expected_status", [
        ("hello.txt",   b"Hello World",        "text/plain",         status.HTTP_201_CREATED),
        ("img.png",     b"\x89PNG\r\n\x1a\n",  "image/png",          status.HTTP_201_CREATED),
        ("img.jpg",     b"\xff\xd8\xff\xe0",   "image/jpeg",         status.HTTP_201_CREATED),
        ("img.jpeg",    b"\xff\xd8\xff\xe0",   "image/jpeg",         status.HTTP_201_CREATED),
        ("img.gif",     b"GIF89a\x01\x00",     "image/gif",          status.HTTP_201_CREATED),
        ("img.bmp",     b"BM\x00\x00\x00\x00", "image/bmp",          status.HTTP_201_CREATED),
    ])
    def test_import_parametrized(self, client, pro_headers, filename, content, content_type, expected_status):
        """Should import files of all supported formats."""
        response = client.post(
            "/pdfs/import",
            headers=pro_headers,
            files={"file": (filename, content, content_type)},
        )
        assert response.status_code == expected_status

    # ------------------------------------------------------------------
    # MIME type validation tests
    # ------------------------------------------------------------------

    @pytest.mark.parametrize("filename,content,content_type", [
        ("hello.txt",  b"Hello", "application/octet-stream"),
        ("img.png",    b"\x89PNG\x00", "application/octet-stream"),
        ("img.jpg",    b"\xff\xd8", "text/plain"),
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
        assert response.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
        assert "File too large" in response.text