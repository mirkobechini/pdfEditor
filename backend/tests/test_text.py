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

    def test_replace_text_preserves_font_size_position(self, client, pro_headers):
        """Replacement text should keep the original font, size and baseline."""
        import fitz

        doc = fitz.open()
        page_idx = doc.insert_page(-1, width=612, height=792)
        page = doc[page_idx]
        # Use a non-default font and size so we can verify preservation
        page.insert_text((50, 100), "Hello World", fontname="tiro", fontsize=24)
        content = doc.tobytes()
        doc.close()

        from tests.conftest import upload_pdf
        doc_id = upload_pdf(client, pro_headers, content, filename="font.pdf")

        response = client.post(
            f"/pdfs/{doc_id}/replace-text",
            headers=pro_headers,
            json={"search": "World", "replace": "There"},
        )
        assert response.status_code == status.HTTP_200_OK
        new_id = response.json()["id"]

        # Download the REPLACED PDF (new_id, not doc_id)
        dl = client.get(f"/pdfs/{new_id}/download", headers=pro_headers)
        assert dl.status_code == status.HTTP_200_OK
        replaced = fitz.open(stream=dl.content, filetype="pdf")
        page = replaced[0]
        data = page.get_text("dict")
        spans = []
        for block in data.get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    spans.append(span)
        replaced.close()

        # The replacement "There" should exist with the same font and size
        there_spans = [s for s in spans if "There" in s.get("text", "")]
        assert there_spans, "Replacement text not found in output PDF"
        span = there_spans[0]
        assert span["size"] == 24, f"Expected size 24, got {span['size']}"
        # Baseline origin should be near the original (50, 100)
        origin = span["origin"]
        assert abs(origin[0] - 50) < 5, f"Origin x {origin[0]} too far from 50"
        assert abs(origin[1] - 100) < 5, f"Origin y {origin[1]} too far from 100"


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