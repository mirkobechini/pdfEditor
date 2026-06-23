"""Tests for PDF reorder and remove-pages API endpoints."""

from fastapi import status


class TestReorder:
    """Test suite for PDF reorder endpoint."""

    def upload_pages(self, client, n=3):
        """Upload a multi-page PDF."""
        import fitz

        doc = fitz.open()
        for _ in range(n):
            doc.insert_page(-1, width=612, height=792)
        content = doc.tobytes()
        doc.close()

        resp = client.post(
            "/pdfs/upload",
            files={"file": ("multi.pdf", content, "application/pdf")},
        )
        return resp.json()["id"]

    def test_reorder_pages(self, client):
        """Should reorder pages of a PDF."""
        doc_id = self.upload_pages(client, 3)

        response = client.post(
            f"/pdfs/{doc_id}/reorder",
            json={"page_order": [3, 1, 2]},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["page_count"] == 3
        assert "_reordered.pdf" in data["original_filename"]

    def test_reorder_single_page_invalid(self, client):
        """Should reject reorder with only one page."""
        doc_id = self.upload_pages(client, 3)

        response = client.post(
            f"/pdfs/{doc_id}/reorder",
            json={"page_order": [1]},  # only 1 page, but PDF has 3
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_reorder_wrong_count(self, client):
        """Should reject reorder with wrong number of pages."""
        doc_id = self.upload_pages(client, 3)

        response = client.post(
            f"/pdfs/{doc_id}/reorder",
            json={"page_order": [1, 2, 3, 4]},  # 4 pages, but PDF has 3
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_reorder_invalid_page_number(self, client):
        """Should reject reorder with out-of-range page."""
        doc_id = self.upload_pages(client, 3)

        response = client.post(
            f"/pdfs/{doc_id}/reorder",
            json={"page_order": [1, 2, 99]},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_reorder_non_existent_pdf(self, client):
        """Should reject reorder on non-existent PDF."""
        response = client.post(
            "/pdfs/fake-id/reorder",
            json={"page_order": [1, 2, 3]},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestRemovePages:
    """Test suite for PDF remove-pages endpoint."""

    def upload_pages(self, client, n=5):
        """Upload a multi-page PDF."""
        import fitz

        doc = fitz.open()
        for _ in range(n):
            doc.insert_page(-1, width=612, height=792)
        content = doc.tobytes()
        doc.close()

        resp = client.post(
            "/pdfs/upload",
            files={"file": ("multi.pdf", content, "application/pdf")},
        )
        return resp.json()["id"]

    def test_remove_single_page(self, client):
        """Should remove a single page from a PDF."""
        doc_id = self.upload_pages(client, 5)

        response = client.post(
            f"/pdfs/{doc_id}/remove-pages",
            json={"page_numbers": [3]},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["page_count"] == 4
        assert "_pages_removed.pdf" in data["original_filename"]

    def test_remove_multiple_pages(self, client):
        """Should remove multiple pages from a PDF."""
        doc_id = self.upload_pages(client, 5)

        response = client.post(
            f"/pdfs/{doc_id}/remove-pages",
            json={"page_numbers": [2, 4]},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["page_count"] == 3

    def test_remove_invalid_page(self, client):
        """Should reject removal of non-existent page."""
        doc_id = self.upload_pages(client, 5)

        response = client.post(
            f"/pdfs/{doc_id}/remove-pages",
            json={"page_numbers": [99]},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_remove_all_pages_invalid(self, client):
        """Should reject removal of all pages."""
        doc_id = self.upload_pages(client, 3)

        response = client.post(
            f"/pdfs/{doc_id}/remove-pages",
            json={"page_numbers": [1, 2, 3]},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_remove_empty_list(self, client):
        """Should reject empty page_numbers list."""
        doc_id = self.upload_pages(client, 3)

        response = client.post(
            f"/pdfs/{doc_id}/remove-pages",
            json={"page_numbers": []},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_remove_non_existent_pdf(self, client):
        """Should reject remove-pages on non-existent PDF."""
        response = client.post(
            "/pdfs/fake-id/remove-pages",
            json={"page_numbers": [1]},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST