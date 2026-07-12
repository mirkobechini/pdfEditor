"""Tests for PDF upload and download API endpoints."""

import os

from fastapi import status
from app.core.config import settings


class TestUpload:
    """Test suite for PDF upload endpoint."""

    UPLOAD_URL = "/pdfs/upload"

    def test_upload_valid_pdf(self, client, sample_pdf_content, free_headers):
        """Should upload a valid PDF and return metadata."""
        response = client.post(
            self.UPLOAD_URL,
            headers=free_headers,
            files={"file": ("test.pdf", sample_pdf_content, "application/pdf")},
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["original_filename"] == "test.pdf"
        assert data["file_size"] > 0
        assert data["page_count"] >= 0
        assert "id" in data
        assert "created_at" in data

    def test_upload_invalid_extension(self, client, free_headers):
        """Should reject non-PDF files."""
        response = client.post(
            self.UPLOAD_URL,
            headers=free_headers,
            files={"file": ("test.txt", b"not a pdf", "text/plain")},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Only PDF files are allowed" in response.json()["detail"]

    def test_upload_invalid_content(self, client, free_headers):
        """Should reject files with .pdf extension but invalid content (no magic bytes)."""
        response = client.post(
            self.UPLOAD_URL,
            headers=free_headers,
            files={"file": ("fake.pdf", b"not a pdf content", "application/pdf")},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid PDF" in response.json()["detail"]

    def test_upload_empty_file(self, client, free_headers):
        """Should reject empty files."""
        response = client.post(
            self.UPLOAD_URL,
            headers=free_headers,
            files={"file": ("empty.pdf", b"", "application/pdf")},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_upload_exceeds_size_limit(self, client, monkeypatch, free_headers):
        """Should reject files that exceed MAX_UPLOAD_SIZE_MB."""
        monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_MB", 0)
        response = client.post(
            self.UPLOAD_URL,
            headers=free_headers,
            files={"file": ("large.pdf", b"%PDF-1.4 some content", "application/pdf")},
        )
        assert response.status_code == 413
        assert "too large" in response.json()["detail"].lower()

    def test_upload_exceeds_page_limit(self, client, monkeypatch, sample_pdf_content, free_headers):
        """Should reject PDFs with too many pages."""
        monkeypatch.setattr(settings, "MAX_PAGE_COUNT", 0)
        response = client.post(
            self.UPLOAD_URL,
            headers=free_headers,
            files={"file": ("test.pdf", sample_pdf_content, "application/pdf")},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Maximum allowed" in response.json()["detail"]

    def test_upload_requires_auth(self, client, sample_pdf_content):
        """Should reject upload without auth."""
        response = client.post(
            self.UPLOAD_URL,
            files={"file": ("test.pdf", sample_pdf_content, "application/pdf")},
        )
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


class TestGetPdf:
    """Test suite for getting PDF metadata."""

    def test_get_pdf_by_id(self, client, sample_pdf_content, free_headers):
        """Should return PDF metadata by ID."""
        from tests.conftest import upload_pdf
        pdf_id = upload_pdf(client, free_headers, sample_pdf_content)

        response = client.get(f"/pdfs/{pdf_id}", headers=free_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == pdf_id
        assert response.json()["original_filename"] == "test.pdf"

    def test_get_pdf_not_found(self, client, free_headers):
        """Should return 404 for non-existent PDF."""
        response = client.get("/pdfs/non-existent-id", headers=free_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_pdf_requires_auth(self, client, sample_pdf_content):
        """Should reject get without auth."""
        response = client.get("/pdfs/some-id")
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_get_pdf_cannot_see_other_user(self, client, sample_pdf_content, free_headers, free_token):
        """Should reject access to another user's PDF."""
        from tests.conftest import upload_pdf
        pdf_id = upload_pdf(client, free_headers, sample_pdf_content)

        # Register a second user and try to access the PDF
        client.post(
            "/auth/register",
            json={"email": "other@test.com", "password": "TestPass123", "full_name": "Other"},
        )
        resp = client.post(
            "/auth/login",
            json={"email": "other@test.com", "password": "TestPass123"},
        )
        other_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

        response = client.get(f"/pdfs/{pdf_id}", headers=other_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestListPdfs:
    """Test suite for listing PDFs."""

    LIST_URL = "/pdfs"

    def test_list_empty(self, client, free_headers):
        """Should return empty list when no PDFs exist."""
        response = client.get(self.LIST_URL, headers=free_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_list_multiple(self, client, sample_pdf_content, free_headers):
        """Should return all uploaded PDFs for the current user."""
        from tests.conftest import upload_pdf
        for i in range(3):
            upload_pdf(client, free_headers, sample_pdf_content, filename=f"test_{i}.pdf")

        response = client.get(self.LIST_URL, headers=free_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3

    def test_list_isolates_users(self, client, sample_pdf_content, free_headers):
        """Should show only the current user's PDFs."""
        from tests.conftest import upload_pdf
        upload_pdf(client, free_headers, sample_pdf_content)

        # Second user
        client.post(
            "/auth/register",
            json={"email": "other@test.com", "password": "TestPass123", "full_name": "Other"},
        )
        resp = client.post(
            "/auth/login",
            json={"email": "other@test.com", "password": "TestPass123"},
        )
        other_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

        response = client.get(self.LIST_URL, headers=other_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 0

    def test_list_requires_auth(self, client):
        """Should reject list without auth."""
        response = client.get(self.LIST_URL)
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


class TestDownload:
    """Test suite for PDF download endpoint."""

    def test_download_pdf(self, client, sample_pdf_content, free_headers):
        """Should download a PDF file."""
        from tests.conftest import upload_pdf
        pdf_id = upload_pdf(client, free_headers, sample_pdf_content)

        response = client.get(f"/pdfs/{pdf_id}/download", headers=free_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.headers["content-type"] == "application/pdf"
        assert response.content == sample_pdf_content

    def test_download_not_found(self, client, free_headers):
        """Should return 404 for non-existent PDF download."""
        response = client.get("/pdfs/non-existent-id/download", headers=free_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_download_requires_auth(self, client, sample_pdf_content):
        """Should reject download without auth."""
        response = client.get("/pdfs/some-id/download")
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


class TestDelete:
    """Test suite for PDF delete endpoint."""

    def test_delete_pdf(self, client, sample_pdf_content, free_headers):
        """Should delete a PDF and return 204."""
        from tests.conftest import upload_pdf
        pdf_id = upload_pdf(client, free_headers, sample_pdf_content)

        response = client.delete(f"/pdfs/{pdf_id}", headers=free_headers)
        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify it's gone
        get_resp = client.get(f"/pdfs/{pdf_id}", headers=free_headers)
        assert get_resp.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_not_found(self, client, free_headers):
        """Should return 404 for non-existent PDF delete."""
        response = client.delete("/pdfs/non-existent-id", headers=free_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_requires_auth(self, client, sample_pdf_content):
        """Should reject delete without auth."""
        response = client.delete("/pdfs/some-id")
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_delete_cannot_delete_other(self, client, sample_pdf_content, free_headers):
        """Should reject deleting another user's PDF."""
        from tests.conftest import upload_pdf
        pdf_id = upload_pdf(client, free_headers, sample_pdf_content)

        client.post(
            "/auth/register",
            json={"email": "other@test.com", "password": "TestPass123", "full_name": "Other"},
        )
        resp = client.post(
            "/auth/login",
            json={"email": "other@test.com", "password": "TestPass123"},
        )
        other_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

        response = client.delete(f"/pdfs/{pdf_id}", headers=other_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND