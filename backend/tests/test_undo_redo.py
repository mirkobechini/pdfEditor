"""Tests for undo/redo endpoints."""

from fastapi import status


class TestUndoRedo:
    """Test suite for POST /pdfs/{pdf_id}/undo and /pdfs/{pdf_id}/redo."""

    def _upload_and_get_id(self, client, headers, content: bytes, filename: str = "test.pdf"):
        resp = client.post(
            "/pdfs/upload",
            headers=headers,
            files={"file": (filename, content, "application/pdf")},
        )
        assert resp.status_code == status.HTTP_201_CREATED, f"Upload failed: {resp.text}"
        return resp.json()["id"]

    def test_undo_nothing_to_undo(self, client, pro_headers, sample_pdf_content):
        """Undo on a PDF with no snapshots should return 400."""
        pdf_id = self._upload_and_get_id(client, pro_headers, sample_pdf_content)
        response = client.post(f"/pdfs/{pdf_id}/undo", headers=pro_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_redo_nothing_to_redo(self, client, pro_headers, sample_pdf_content):
        """Redo on a PDF with no redo stack should return 400."""
        pdf_id = self._upload_and_get_id(client, pro_headers, sample_pdf_content)
        response = client.post(f"/pdfs/{pdf_id}/redo", headers=pro_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_undo_unauthorized(self, client):
        """Undo without token should return 401."""
        response = client.post("/pdfs/fake-id/undo")
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_redo_unauthorized(self, client):
        """Redo without token should return 401."""
        response = client.post("/pdfs/fake-id/redo")
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
