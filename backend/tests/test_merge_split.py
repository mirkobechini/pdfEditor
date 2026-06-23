"""Tests for PDF merge and split API endpoints."""

from fastapi import status


class TestMerge:
    """Test suite for PDF merge endpoint."""

    MERGE_URL = "/pdfs/merge"

    def test_merge_two_pdfs(self, client, sample_pdf_content):
        """Should merge two PDFs into one."""
        # Upload two PDFs
        resp1 = client.post(
            "/pdfs/upload",
            files={"file": ("a.pdf", sample_pdf_content, "application/pdf")},
        )
        resp2 = client.post(
            "/pdfs/upload",
            files={"file": ("b.pdf", sample_pdf_content, "application/pdf")},
        )
        id1 = resp1.json()["id"]
        id2 = resp2.json()["id"]

        response = client.post(self.MERGE_URL, json={"pdf_ids": [id1, id2]})
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["original_filename"].startswith("merged_")
        assert data["page_count"] == 2  # each has 1 page

    def test_merge_single_pdf_raises_error(self, client, sample_pdf_content):
        """Should reject merge with only one PDF."""
        resp = client.post(
            "/pdfs/upload",
            files={"file": ("a.pdf", sample_pdf_content, "application/pdf")},
        )
        pid = resp.json()["id"]

        response = client.post(self.MERGE_URL, json={"pdf_ids": [pid]})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_merge_non_existent_pdf(self, client):
        """Should reject merge with non-existent PDF ID."""
        response = client.post(
            self.MERGE_URL, json={"pdf_ids": ["fake-id-1", "fake-id-2"]}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestSplit:
    """Test suite for PDF split endpoint."""

    def upload_single(self, client, sample_pdf_content, pages=3):
        """Upload a multi-page PDF for split testing."""
        import fitz

        doc = fitz.open()
        for _ in range(pages):
            doc.insert_page(-1, width=612, height=792)
        content = doc.tobytes()
        doc.close()

        resp = client.post(
            "/pdfs/upload",
            files={"file": ("multi.pdf", content, "application/pdf")},
        )
        return resp.json()["id"]

    def test_split_every_page(self, client, sample_pdf_content):
        """Should split a PDF into individual pages."""
        doc_id = self.upload_single(client, sample_pdf_content, pages=3)

        response = client.post(f"/pdfs/{doc_id}/split", json={"mode": "every"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) == 3
        for item in data["items"]:
            assert item["page_count"] == 1

    def test_split_by_range(self, client, sample_pdf_content):
        """Should split a PDF by page ranges."""
        doc_id = self.upload_single(client, sample_pdf_content, pages=5)

        response = client.post(
            f"/pdfs/{doc_id}/split",
            json={"mode": "range", "ranges": ["1-3", "3-5"]},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) == 2
        # Range "1-3" = pages 1,2,3 (3 pages)
        assert data["items"][0]["page_count"] == 3
        # Range "3-5" = pages 3,4,5 (3 pages)
        assert data["items"][1]["page_count"] == 3

    def test_split_invalid_mode(self, client, sample_pdf_content):
        """Should reject split with invalid mode."""
        doc_id = self.upload_single(client, sample_pdf_content, pages=3)

        response = client.post(
            f"/pdfs/{doc_id}/split", json={"mode": "invalid"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_split_missing_ranges(self, client, sample_pdf_content):
        """Should reject range mode without ranges."""
        doc_id = self.upload_single(client, sample_pdf_content, pages=3)

        response = client.post(
            f"/pdfs/{doc_id}/split", json={"mode": "range"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_split_invalid_range(self, client, sample_pdf_content):
        """Should reject invalid page range."""
        doc_id = self.upload_single(client, sample_pdf_content, pages=3)

        response = client.post(
            f"/pdfs/{doc_id}/split",
            json={"mode": "range", "ranges": ["1-99"]},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_split_non_existent_pdf(self, client):
        """Should reject split on non-existent PDF."""
        response = client.post(
            "/pdfs/fake-id/split", json={"mode": "every"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST