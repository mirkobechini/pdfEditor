"""Tests for PDF upload and download API endpoints."""

import os

from fastapi import status
from app.core.config import settings


class TestUpload:
    """Test suite for PDF upload endpoint."""

    UPLOAD_URL = "/pdfs/upload"

    def test_upload_valid_pdf(self, client, sample_pdf_content):
        """Should upload a valid PDF and return metadata."""
        response = client.post(
            self.UPLOAD_URL,
            files={"file": ("test.pdf", sample_pdf_content, "application/pdf")},
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["original_filename"] == "test.pdf"
        assert data["file_size"] > 0
        assert data["page_count"] >= 0
        assert "id" in data
        assert "created_at" in data

    def test_upload_invalid_extension(self, client):
        """Should reject non-PDF files."""
        response = client.post(
            self.UPLOAD_URL,
            files={"file": ("test.txt", b"not a pdf", "text/plain")},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Only PDF files are allowed" in response.json()["detail"]

    def test_upload_invalid_content(self, client):
        """Should reject files with .pdf extension but invalid content (no magic bytes)."""
        response = client.post(
            self.UPLOAD_URL,
            files={"file": ("fake.pdf", b"not a pdf content", "application/pdf")},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid PDF" in response.json()["detail"]

    def test_upload_empty_file(self, client):
        """Should reject empty files."""
        response = client.post(
            self.UPLOAD_URL,
            files={"file": ("empty.pdf", b"", "application/pdf")},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_upload_exceeds_size_limit(self, client, monkeypatch):
        """Should reject files that exceed MAX_UPLOAD_SIZE_MB."""
        # Temporarily set limit to 0 MB, so any file exceeds it
        monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_MB", 0)
        response = client.post(
            self.UPLOAD_URL,
            files={"file": ("large.pdf", b"%PDF-1.4 some content", "application/pdf")},
        )
        assert response.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
        assert "too large" in response.json()["detail"].lower()

    def test_upload_exceeds_page_limit(self, client, monkeypatch, sample_pdf_content):
        """Should reject PDFs with too many pages."""
        # Temporarily set page limit to 0
        monkeypatch.setattr(settings, "MAX_PAGE_COUNT", 0)
        response = client.post(
            self.UPLOAD_URL,
            files={"file": ("test.pdf", sample_pdf_content, "application/pdf")},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Maximum allowed" in response.json()["detail"]


class TestGetPdf:
    """Test suite for getting PDF metadata."""

    def test_get_pdf_by_id(self, client, sample_pdf_content):
        """Should return PDF metadata by ID."""
        # Upload first
        upload_resp = client.post(
            "/pdfs/upload",
            files={"file": ("test.pdf", sample_pdf_content, "application/pdf")},
        )
        pdf_id = upload_resp.json()["id"]

        # Get by ID
        response = client.get(f"/pdfs/{pdf_id}")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == pdf_id
        assert response.json()["original_filename"] == "test.pdf"

    def test_get_pdf_not_found(self, client):
        """Should return 404 for non-existent PDF."""
        response = client.get("/pdfs/non-existent-id")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestListPdfs:
    """Test suite for listing PDFs."""

    LIST_URL = "/pdfs"

    def test_list_empty(self, client):
        """Should return empty list when no PDFs exist."""
        response = client.get(self.LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_list_multiple(self, client, sample_pdf_content):
        """Should return all uploaded PDFs."""
        # Upload 3 PDFs
        for i in range(3):
            client.post(
                "/pdfs/upload",
                files={"file": (f"test_{i}.pdf", sample_pdf_content, "application/pdf")},
            )

        response = client.get(self.LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3


class TestDownload:
    """Test suite for PDF download endpoint."""

    def test_download_pdf(self, client, sample_pdf_content):
        """Should download a PDF file."""
        upload_resp = client.post(
            "/pdfs/upload",
            files={"file": ("test.pdf", sample_pdf_content, "application/pdf")},
        )
        pdf_id = upload_resp.json()["id"]

        response = client.get(f"/pdfs/{pdf_id}/download")
        assert response.status_code == status.HTTP_200_OK
        assert response.headers["content-type"] == "application/pdf"
        assert response.content == sample_pdf_content

    def test_download_not_found(self, client):
        """Should return 404 for non-existent PDF download."""
        response = client.get("/pdfs/non-existent-id/download")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestDelete:
    """Test suite for PDF delete endpoint."""

    def test_delete_pdf(self, client, sample_pdf_content):
        """Should delete a PDF and return 204."""
        upload_resp = client.post(
            "/pdfs/upload",
            files={"file": ("test.pdf", sample_pdf_content, "application/pdf")},
        )
        pdf_id = upload_resp.json()["id"]

        response = client.delete(f"/pdfs/{pdf_id}")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify it's gone
        get_resp = client.get(f"/pdfs/{pdf_id}")
        assert get_resp.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_not_found(self, client):
        """Should return 404 for non-existent PDF delete."""
        response = client.delete("/pdfs/non-existent-id")
        assert response.status_code == status.HTTP_404_NOT_FOUND