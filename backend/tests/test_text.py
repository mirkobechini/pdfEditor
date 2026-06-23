"""Tests for PDF text editing API endpoints."""

from fastapi import status


class TestReplaceText:
    """Test suite for PDF replace-text endpoint."""

    URL = "/pdfs/{pdf_id}/replace-text"

    def upload_text_pdf(self, client):
        """Create a PDF with known text content."""
        import fitz

        doc = fitz.open()
        page_idx = doc.insert_page(-1, width=612, height=792)
        page = doc[page_idx]
        page.insert_text((50, 100), "Hello World", fontname="helv", fontsize=20)
        content = doc.tobytes()
        doc.close()

        resp = client.post(
            "/pdfs/upload",
            files={"file": ("text.pdf", content, "application/pdf")},
        )
        return resp.json()["id"]

    def test_replace_text_single(self, client):
        """Should replace text in a PDF."""
        doc_id = self.upload_text_pdf(client)

        response = client.post(
            f"/pdfs/{doc_id}/replace-text",
            json={"search": "World", "replace": "There"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "_text_replaced.pdf" in data["original_filename"]
        assert data["page_count"] == 1

    def test_replace_text_occurrence(self, client):
        """Should replace a specific occurrence."""
        doc_id = self.upload_text_pdf(client)

        response = client.post(
            f"/pdfs/{doc_id}/replace-text",
            json={"search": "World", "replace": "There", "occurrence": 1},
        )
        assert response.status_code == status.HTTP_200_OK

    def test_replace_empty_search(self, client):
        """Should reject empty search text."""
        doc_id = self.upload_text_pdf(client)

        response = client.post(
            f"/pdfs/{doc_id}/replace-text",
            json={"search": "", "replace": "There"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_replace_non_existent_pdf(self, client):
        """Should reject replace on non-existent PDF."""
        response = client.post(
            "/pdfs/fake-id/replace-text",
            json={"search": "Hello", "replace": "Hi"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestExtractText:
    """Test suite for PDF text extraction endpoint."""

    def test_extract_text_all_pages(self, client, sample_pdf_content):
        """Should extract text from a PDF (basic sanity)."""
        resp = client.post(
            "/pdfs/upload",
            files={"file": ("text.pdf", sample_pdf_content, "application/pdf")},
        )
        doc_id = resp.json()["id"]

        response = client.get(f"/pdfs/{doc_id}/text")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["pages"] == 1
        assert isinstance(data["text"], str)

    def test_extract_text_single_page(self, client, sample_pdf_content):
        """Should extract text from a single page."""
        # Use sample_pdf_content (1 page), create a 3-page variant
        import fitz

        doc = fitz.open()
        for i in range(3):
            doc.insert_page(-1, width=612, height=792)
        content = doc.tobytes()
        doc.close()

        resp = client.post(
            "/pdfs/upload",
            files={"file": ("multi.pdf", content, "application/pdf")},
        )
        doc_id = resp.json()["id"]

        response = client.get(f"/pdfs/{doc_id}/text?page=2")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["pages"] == 3

    def test_extract_text_invalid_page(self, client, sample_pdf_content):
        """Should reject invalid page number."""
        resp = client.post(
            "/pdfs/upload",
            files={"file": ("test.pdf", sample_pdf_content, "application/pdf")},
        )
        doc_id = resp.json()["id"]

        response = client.get(f"/pdfs/{doc_id}/text?page=99")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_extract_text_non_existent_pdf(self, client):
        """Should reject extract on non-existent PDF."""
        response = client.get("/pdfs/fake-id/text")
        assert response.status_code == status.HTTP_400_BAD_REQUEST