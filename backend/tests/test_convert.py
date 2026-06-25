"""Tests for PDF conversion API endpoints."""

from fastapi import status


class TestExport:
    """Test suite for PDF export endpoint."""

    def upload_pdf(self, client):
        resp = client.post(
            "/pdfs/upload",
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
        doc_id = self.upload_pdf(client)

        response = client.post(f"/pdfs/{doc_id}/export?fmt=txt", headers=pro_headers)
        assert response.status_code == status.HTTP_200_OK
        assert "text/plain" in response.headers["content-type"]

    def test_export_png(self, client, pro_headers):
        """Should export PDF to PNG image."""
        doc_id = self.upload_pdf(client)

        response = client.post(f"/pdfs/{doc_id}/export?fmt=png", headers=pro_headers)
        assert response.status_code == status.HTTP_200_OK
        assert "image/png" in response.headers["content-type"]

    def test_export_jpg(self, client, pro_headers):
        """Should export PDF to JPEG image."""
        doc_id = self.upload_pdf(client)

        response = client.post(f"/pdfs/{doc_id}/export?fmt=jpg", headers=pro_headers)
        assert response.status_code == status.HTTP_200_OK
        assert "image/jpeg" in response.headers["content-type"]

    def test_export_invalid_format(self, client, pro_headers):
        """Should reject unsupported export format."""
        doc_id = self.upload_pdf(client)

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