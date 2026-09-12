"""Tests for the PDF compression endpoint."""

import pytest
from fastapi import status

from tests.conftest import upload_pdf


class TestCompress:
    """Test suite for POST /pdfs/{id}/compress."""

    def test_compress_creates_new_document(self, client, sample_pdf_content, pro_headers):
        """Compressing a PDF should create a new document by default."""
        doc_id = upload_pdf(client, pro_headers, sample_pdf_content, filename="orig.pdf")

        response = client.post(
            f"/pdfs/{doc_id}/compress",
            headers=pro_headers,
            json={"quality": "medium"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] != doc_id  # new document
        assert data["original_filename"].startswith("compressed_")
        assert data["page_count"] == 1

    def test_compress_with_custom_filename(self, client, sample_pdf_content, pro_headers):
        """The user can specify the output filename."""
        doc_id = upload_pdf(client, pro_headers, sample_pdf_content, filename="orig.pdf")

        response = client.post(
            f"/pdfs/{doc_id}/compress",
            headers=pro_headers,
            json={"quality": "low", "output_filename": "my-compressed"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["original_filename"] == "my-compressed.pdf"

    def test_compress_overwrite(self, client, sample_pdf_content, pro_headers):
        """With overwrite=True, the original PDF is replaced in place."""
        doc_id = upload_pdf(client, pro_headers, sample_pdf_content, filename="orig.pdf")

        response = client.post(
            f"/pdfs/{doc_id}/compress",
            headers=pro_headers,
            json={"quality": "high", "overwrite": True},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == doc_id  # same document
        assert data["original_filename"] == "orig.pdf"  # name preserved

    def test_compress_non_existent_pdf(self, client, pro_headers):
        """Compressing a non-existent PDF should return 404."""
        response = client.post(
            "/pdfs/non-existent-id/compress",
            headers=pro_headers,
            json={"quality": "medium"},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_compress_requires_auth(self, client):
        """Compressing without auth should return 401/403."""
        # No prior authenticated request → no session cookie → 401/403
        response = client.post(
            "/pdfs/any-id/compress",
            json={"quality": "medium"},
        )
        assert response.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )

    def test_compress_invalid_quality(self, client, sample_pdf_content, pro_headers):
        """An invalid quality value should return 422."""
        doc_id = upload_pdf(client, pro_headers, sample_pdf_content)

        response = client.post(
            f"/pdfs/{doc_id}/compress",
            headers=pro_headers,
            json={"quality": "ultra"},
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY