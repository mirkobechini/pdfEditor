"""Tests for PDF merge and split API endpoints."""

from fastapi import status


class TestMerge:
    """Test suite for PDF merge endpoint."""

    MERGE_URL = "/pdfs/merge"

    def test_merge_two_pdfs(self, client, sample_pdf_content, pro_headers):
        """Should merge two PDFs into one."""
        from tests.conftest import upload_pdf
        id1 = upload_pdf(client, pro_headers, sample_pdf_content)
        id2 = upload_pdf(client, pro_headers, sample_pdf_content)

        response = client.post(self.MERGE_URL, headers=pro_headers, json={"pdf_ids": [id1, id2]})
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["original_filename"].startswith("merged_")
        assert data["page_count"] == 2  # each has 1 page

    def test_merge_single_pdf_raises_error(self, client, sample_pdf_content, pro_headers):
        """Should reject merge with only one PDF."""
        from tests.conftest import upload_pdf
        pid = upload_pdf(client, pro_headers, sample_pdf_content)

        response = client.post(self.MERGE_URL, headers=pro_headers, json={"pdf_ids": [pid]})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_merge_non_existent_pdf(self, client, pro_headers):
        """Should reject merge with non-existent PDF ID."""
        response = client.post(
            self.MERGE_URL, headers=pro_headers, json={"pdf_ids": ["fake-id-1", "fake-id-2"]}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestSplit:
    """Test suite for PDF split endpoint."""

    def upload_single(self, client, pro_headers, sample_pdf_content, pages=3):
        """Upload a multi-page PDF for split testing with pro auth."""
        import fitz

        doc = fitz.open()
        for _ in range(pages):
            doc.insert_page(-1, width=612, height=792)
        content = doc.tobytes()
        doc.close()

        from tests.conftest import upload_pdf
        return upload_pdf(client, pro_headers, content, filename="multi.pdf")

    def test_split_every_page(self, client, sample_pdf_content, pro_headers):
        """Should split a PDF into individual pages."""
        doc_id = self.upload_single(client, pro_headers, sample_pdf_content, pages=3)

        response = client.post(f"/pdfs/{doc_id}/split", headers=pro_headers, json={"mode": "every"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) == 3
        for item in data["items"]:
            assert item["page_count"] == 1

    def test_split_by_range(self, client, sample_pdf_content, pro_headers):
        """Should split a PDF by page ranges."""
        doc_id = self.upload_single(client, pro_headers, sample_pdf_content, pages=5)

        response = client.post(
            f"/pdfs/{doc_id}/split",
            headers=pro_headers,
            json={"mode": "range", "ranges": ["1-3", "3-5"]},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) == 2
        assert data["items"][0]["page_count"] == 3
        assert data["items"][1]["page_count"] == 3

    def test_split_invalid_mode(self, client, sample_pdf_content, pro_headers):
        """Should reject split with invalid mode."""
        doc_id = self.upload_single(client, pro_headers, sample_pdf_content, pages=3)

        response = client.post(
            f"/pdfs/{doc_id}/split", headers=pro_headers, json={"mode": "invalid"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_split_missing_ranges(self, client, sample_pdf_content, pro_headers):
        """Should reject range mode without ranges."""
        doc_id = self.upload_single(client, pro_headers, sample_pdf_content, pages=3)

        response = client.post(
            f"/pdfs/{doc_id}/split", headers=pro_headers, json={"mode": "range"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_split_invalid_range(self, client, sample_pdf_content, pro_headers):
        """Should reject invalid page range."""
        doc_id = self.upload_single(client, pro_headers, sample_pdf_content, pages=3)

        response = client.post(
            f"/pdfs/{doc_id}/split",
            headers=pro_headers,
            json={"mode": "range", "ranges": ["1-99"]},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_split_non_existent_pdf(self, client, pro_headers):
        """Should reject split on non-existent PDF."""
        response = client.post(
            "/pdfs/fake-id/split", headers=pro_headers, json={"mode": "every"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestMergeSplitServiceS3Aware:
    """Unit tests verifying the merge/split service reads file content via the
    S3-aware get_file_content() helper (issue #737)."""

    def _make_pdf(self, db_session, user_id="user-1"):
        """Create a minimal PdfDocument row in the test DB."""
        from app.models.pdf import PdfDocument
        pdf = PdfDocument(
            original_filename="test.pdf",
            storage_filename="abc-123.pdf",
            file_size=100,
            page_count=1,
            user_id=user_id,
        )
        db_session.add(pdf)
        db_session.commit()
        db_session.refresh(pdf)
        return pdf

    def test_get_file_content_uses_s3_aware_helper(self, db_session, monkeypatch):
        """_get_file_content should call get_file_content (S3-aware), not get_pdf_path."""
        from app.services.pdf_merge_split_service import PdfMergeSplitService

        pdf = self._make_pdf(db_session)

        called_with = {}
        fake_content = b"%PDF-1.4 fake content"

        def fake_get_file_content(file_uuid):
            called_with["file_uuid"] = file_uuid
            return fake_content

        monkeypatch.setattr(
            "app.services.pdf_merge_split_service.get_file_content",
            fake_get_file_content,
        )

        service = PdfMergeSplitService(db_session)
        result = service._get_file_content(pdf)

        assert called_with.get("file_uuid") == "abc-123"
        assert result == fake_content

    def test_get_file_content_returns_none_when_missing(self, db_session, monkeypatch):
        """_get_file_content should return None when get_file_content returns None."""
        from app.services.pdf_merge_split_service import PdfMergeSplitService

        pdf = self._make_pdf(db_session)

        monkeypatch.setattr(
            "app.services.pdf_merge_split_service.get_file_content",
            lambda file_uuid: None,
        )

        service = PdfMergeSplitService(db_session)
        assert service._get_file_content(pdf) is None