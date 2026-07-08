"""Tests for PDF metadata API endpoints."""

from fastapi import status


class TestGetMetadata:
    """Test suite for PDF metadata GET endpoint."""

    def test_get_metadata(self, client, sample_pdf_content, free_headers):
        """Should return metadata for a PDF."""
        from tests.conftest import upload_pdf
        doc_id = upload_pdf(client, free_headers, sample_pdf_content)

        response = client.get(f"/pdfs/{doc_id}/metadata", headers=free_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # New PDFs have default metadata
        assert "title" in data
        assert "author" in data

    def test_get_metadata_non_existent(self, client, free_headers):
        """Should return 400 for non-existent PDF."""
        response = client.get("/pdfs/fake-id/metadata", headers=free_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestUpdateMetadata:
    """Test suite for PDF metadata PUT endpoint."""

    def test_update_title(self, client, sample_pdf_content, pro_headers):
        """Should update the title metadata."""
        from tests.conftest import upload_pdf
        doc_id = upload_pdf(client, pro_headers, sample_pdf_content)

        response = client.put(
            f"/pdfs/{doc_id}/metadata",
            headers=pro_headers,
            json={"title": "New Title"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "_metadata_updated.pdf" in data["original_filename"]

    def test_update_all_fields(self, client, sample_pdf_content, pro_headers):
        """Should update all metadata fields."""
        from tests.conftest import upload_pdf
        doc_id = upload_pdf(client, pro_headers, sample_pdf_content)

        response = client.put(
            f"/pdfs/{doc_id}/metadata",
            headers=pro_headers,
            json={
                "title": "New Title",
                "author": "New Author",
                "subject": "New Subject",
                "keywords": "kw1, kw2",
            },
        )
        assert response.status_code == status.HTTP_200_OK

    def test_update_empty_body(self, client, sample_pdf_content, pro_headers):
        """Should reject empty update."""
        from tests.conftest import upload_pdf
        doc_id = upload_pdf(client, pro_headers, sample_pdf_content)

        response = client.put(
            f"/pdfs/{doc_id}/metadata",
            headers=pro_headers,
            json={},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_non_existent(self, client, pro_headers):
        """Should return 400 for non-existent PDF."""
        response = client.put(
            "/pdfs/fake-id/metadata",
            headers=pro_headers,
            json={"title": "New Title"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST