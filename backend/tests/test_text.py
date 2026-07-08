"""Tests for PDF text editing API endpoints."""

from fastapi import status


class TestReplaceText:
    """Test suite for PDF replace-text endpoint."""

    URL = "/pdfs/{pdf_id}/replace-text"

    def upload_text_pdf(self, client, headers):
        """Create a PDF with known text content."""
        import fitz

        doc = fitz.open()
        page_idx = doc.insert_page(-1, width=612, height=792)
        page = doc[page_idx]
        page.insert_text((50, 100), "Hello World", fontname="helv", fontsize=20)
        content = doc.tobytes()
        doc.close()

        from tests.conftest import upload_pdf
        return upload_pdf(client, headers, content, filename="text.pdf")

    def test_replace_text_single(self, client, pro_headers):
        """Should replace text in a PDF."""
        doc_id = self.upload_text_pdf(client, pro_headers)

        response = client.post(
            f"/pdfs/{doc_id}/replace-text",
            headers=pro_headers,
            json={"search": "World", "replace": "There"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "_text_replaced.pdf" in data["original_filename"]
        assert data["page_count"] == 1

    def test_replace_text_occurrence(self, client, pro_headers):
        """Should replace a specific occurrence."""
        doc_id = self.upload_text_pdf(client, pro_headers)

        response = client.post(
            f"/pdfs/{doc_id}/replace-text",
            headers=pro_headers,
            json={"search": "World", "replace": "There", "occurrence": 1},
        )
        assert response.status_code == status.HTTP_200_OK

    def test_replace_empty_search(self, client, pro_headers):
        """Should reject empty search text."""
        doc_id = self.upload_text_pdf(client, pro_headers)

        response = client.post(
            f"/pdfs/{doc_id}/replace-text",
            headers=pro_headers,
            json={"search": "", "replace": "There"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_replace_non_existent_pdf(self, client, pro_headers):
        """Should reject replace on non-existent PDF."""
        response = client.post(
            "/pdfs/fake-id/replace-text",
            headers=pro_headers,
            json={"search": "Hello", "replace": "Hi"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestExtractText:
    """Test suite for PDF text extraction endpoint."""

    def test_extract_text_all_pages(self, client, sample_pdf_content, free_headers):
        """Should extract text from a PDF (basic sanity)."""
        from tests.conftest import upload_pdf
        doc_id = upload_pdf(client, free_headers, sample_pdf_content)

        response = client.get(f"/pdfs/{doc_id}/text", headers=free_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["pages"] == 1
        assert isinstance(data["text"], str)

    def test_extract_text_single_page(self, client, sample_pdf_content, free_headers):
        """Should extract text from a single page."""
        import fitz

        doc = fitz.open()
        for i in range(3):
            doc.insert_page(-1, width=612, height=792)
        content = doc.tobytes()
        doc.close()

        from tests.conftest import upload_pdf
        doc_id = upload_pdf(client, free_headers, content, filename="multi.pdf")

        response = client.get(f"/pdfs/{doc_id}/text?page=2", headers=free_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["pages"] == 3

    def test_extract_text_invalid_page(self, client, sample_pdf_content, free_headers):
        """Should reject invalid page number."""
        from tests.conftest import upload_pdf
        doc_id = upload_pdf(client, free_headers, sample_pdf_content)

        response = client.get(f"/pdfs/{doc_id}/text?page=99", headers=free_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_extract_text_non_existent_pdf(self, client, free_headers):
        """Should reject extract on non-existent PDF."""
        response = client.get("/pdfs/fake-id/text", headers=free_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST