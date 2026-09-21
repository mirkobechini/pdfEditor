"""Tests for PDF annotation endpoint."""

from unittest.mock import patch

import fitz
from fastapi import status


def _make_pdf() -> bytes:
    """Generate a minimal valid PDF using PyMuPDF."""
    doc = fitz.open()
    page = doc.new_page(width=300, height=300)
    page.insert_text((50, 100), "Annotation test")
    data = doc.tobytes()
    doc.close()
    return data


class TestAnnotations:
    """Test suite for POST /pdfs/{pdf_id}/annotations."""

    UPLOAD_URL = "/pdfs/upload"

    def _upload(self, client, headers, content: bytes, filename: str = "annot.pdf"):
        resp = client.post(
            self.UPLOAD_URL,
            headers=headers,
            files={"file": (filename, content, "application/pdf")},
        )
        assert resp.status_code == status.HTTP_201_CREATED, f"Upload failed: {resp.text}"
        return resp.json()["id"]

    def _annotate(self, client, headers, pdf_id, **overrides):
        payload = {
            "page": 1,
            "type": "highlight",
            "rect": [50, 50, 200, 100],
            "color": "#FFFF00",
            "content": None,
            "points": None,
            "opacity": 0.3,
        }
        payload.update(overrides)
        return client.post(
            f"/pdfs/{pdf_id}/annotations",
            json=payload,
            headers=headers,
        )

    def test_add_highlight(self, client, pro_headers):
        pdf_id = self._upload(client, pro_headers, _make_pdf())
        resp = self._annotate(client, pro_headers, pdf_id)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["id"] == pdf_id

    def test_add_underline(self, client, pro_headers):
        pdf_id = self._upload(client, pro_headers, _make_pdf())
        resp = self._annotate(client, pro_headers, pdf_id, type="underline")
        assert resp.status_code == status.HTTP_200_OK

    def test_add_strikeout(self, client, pro_headers):
        pdf_id = self._upload(client, pro_headers, _make_pdf())
        resp = self._annotate(client, pro_headers, pdf_id, type="strikeout")
        assert resp.status_code == status.HTTP_200_OK

    def test_add_text_annotation(self, client, pro_headers):
        pdf_id = self._upload(client, pro_headers, _make_pdf())
        resp = self._annotate(
            client, pro_headers, pdf_id,
            type="text", content="This is a comment",
        )
        assert resp.status_code == status.HTTP_200_OK

    def test_add_free_text(self, client, pro_headers):
        pdf_id = self._upload(client, pro_headers, _make_pdf())
        resp = self._annotate(
            client, pro_headers, pdf_id,
            type="free_text", content="Note here",
        )
        assert resp.status_code == status.HTTP_200_OK

    def test_add_draw(self, client, pro_headers):
        pdf_id = self._upload(client, pro_headers, _make_pdf())
        resp = self._annotate(
            client, pro_headers, pdf_id,
            type="draw", points=[[50, 50], [100, 100], [150, 80]],
        )
        assert resp.status_code == status.HTTP_200_OK

    def test_draw_requires_points(self, client, pro_headers):
        pdf_id = self._upload(client, pro_headers, _make_pdf())
        resp = self._annotate(client, pro_headers, pdf_id, type="draw", points=[[50, 50]])
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_page(self, client, pro_headers):
        pdf_id = self._upload(client, pro_headers, _make_pdf())
        resp = self._annotate(client, pro_headers, pdf_id, page=99)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_rect(self, client, pro_headers):
        pdf_id = self._upload(client, pro_headers, _make_pdf())
        resp = self._annotate(client, pro_headers, pdf_id, rect=[50, 50, 100])
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_unsupported_type(self, client, pro_headers):
        pdf_id = self._upload(client, pro_headers, _make_pdf())
        # "circle" is not in the Literal → FastAPI returns 422 (validation)
        resp = self._annotate(client, pro_headers, pdf_id, type="circle")
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_requires_pro_tier(self, client, free_headers):
        from app.core.config import settings

        with patch.object(settings, "DISABLE_LICENSE_ENFORCEMENT", False):
            pdf_id = self._upload(client, free_headers, _make_pdf())
            resp = self._annotate(client, free_headers, pdf_id)
            assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_annotation_persists_in_pdf(self, client, pro_headers):
        pdf_id = self._upload(client, pro_headers, _make_pdf())
        resp = self._annotate(client, pro_headers, pdf_id, type="text", content="persisted")
        assert resp.status_code == status.HTTP_200_OK

        # Download and verify the annotation is embedded
        dl = client.get(f"/pdfs/{pdf_id}/download", headers=pro_headers)
        assert dl.status_code == status.HTTP_200_OK
        doc = fitz.open(stream=dl.content, filetype="pdf")
        page = doc[0]
        annots = list(page.annots()) if page.annots() else []
        assert len(annots) > 0
        # The comment text should be visible on the page (free-text annotation)
        page_text = page.get_text()
        assert "persisted" in page_text, (
            f"Annotation text should be visible on the page, got: {page_text!r}"
        )
        doc.close()