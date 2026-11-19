"""Tests for PDF text editing API endpoints."""

from fastapi import status


class TestSafeTextFont:
    """Unit tests for PdfService._safe_text_font (issue #930)."""

    def _svc(self):
        from app.services.pdf_service import PdfService
        # Il metodo è puro (non tocca il db) → si testa con db=None.
        return PdfService(db=None)

    def test_keeps_safe_base14_fonts(self):
        svc = self._svc()
        for name in ("helv", "HELV", "tiro", "cour", "symb", "times", "zadb"):
            assert svc._safe_text_font(name) == name, f"{name} deve restare invariato"

    def test_maps_subset_embedded_font_to_helv(self):
        # Font subset CID (es. da PDF reali) che PyMuPDF non può usare in
        # insert_text → prima causava un 500 (issue #930).
        svc = self._svc()
        assert svc._safe_text_font("ABCDEE+Calibri") == "helv"
        assert svc._safe_text_font("XXXXXX+Helvetica-Bold") == "helv"

    def test_maps_unknown_font_to_helv(self):
        svc = self._svc()
        assert svc._safe_text_font("Calibri") == "helv"
        assert svc._safe_text_font("NotARealFont") == "helv"

    def test_empty_font_to_helv(self):
        svc = self._svc()
        assert svc._safe_text_font("") == "helv"
        assert svc._safe_text_font(None) == "helv"


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

        # x attesa = posizione della PAROLA "World" nel sorgente (diversa
        # dall'inizio dello span, che è 50) — issue #1016
        src = fitz.open(stream=content, filetype="pdf")
        expected_x = src[0].search_for("World")[0].x0
        src.close()

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
        there_rects = page.search_for("There")
        spans = []
        for block in page.get_text("dict").get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    spans.append(span)
        replaced.close()

        # Il testo sostituito esiste ed è alla x della PAROLA, non all'inizio
        # dello span (issue #1016). NB: get_text fonde la riga in un unico span
        # (origin 50), quindi la posizione va verificata con search_for.
        assert there_rects, "Replacement text not found in output PDF"
        assert abs(there_rects[0].x0 - expected_x) < 6, (
            f"x {there_rects[0].x0} dovrebbe stare alla x della parola {expected_x}"
        )
        # Il size della riga resta 24
        assert any(
            s["size"] == 24 and "There" in s.get("text", "") for s in spans
        ), "Size 24 non preservato nel testo sostituito"

    def test_replace_text_middle_of_long_span_keeps_word_position(self, client, pro_headers):
        """Parola nel mezzo di uno span lungo: il testo sostituito deve stare
        dove stava la parola, non all'inizio dello span (issue #1016)."""
        import fitz

        doc = fitz.open()
        page = doc.new_page(width=612, height=792)
        page.insert_text((50, 300), "Hello Beautiful World", fontname="helv", fontsize=20)
        content = doc.tobytes()
        doc.close()

        src = fitz.open(stream=content, filetype="pdf")
        expected = src[0].search_for("World")[0]
        src.close()

        from tests.conftest import upload_pdf
        doc_id = upload_pdf(client, pro_headers, content, filename="longspan.pdf")

        response = client.post(
            f"/pdfs/{doc_id}/replace-text",
            headers=pro_headers,
            json={"search": "World", "replace": "Earth"},
        )
        assert response.status_code == status.HTTP_200_OK
        new_id = response.json()["id"]

        dl = client.get(f"/pdfs/{new_id}/download", headers=pro_headers)
        assert dl.status_code == status.HTTP_200_OK
        replaced = fitz.open(stream=dl.content, filetype="pdf")
        earth_rects = replaced[0].search_for("Earth")
        replaced.close()

        assert earth_rects, "Replacement 'Earth' non trovato nell'output"
        ox = earth_rects[0].x0
        # NON all'inizio dello span (x=50), ma alla x della parola
        assert abs(ox - expected.x0) < 6, (
            f"x {ox} non corrisponde alla posizione della parola {expected.x0}"
        )
        assert ox > 100, f"x {ox} troppo vicina all'inizio dello span (bug #1016)"

    def test_replace_text_reuses_embedded_font(self, client, pro_headers):
        """Su un PDF con font embedded, il testo sostituito deve riusare quel
        font (non il fallback helv): stessa resa di font e grandezza (#1016)."""
        import fitz
        import os
        import pytest

        ttf = None
        for p in (
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        ):
            if os.path.exists(p):
                ttf = p
                break
        if ttf is None:
            pytest.skip("nessun TTF di sistema disponibile per il test")

        doc = fitz.open()
        page = doc.new_page(width=612, height=792)
        page.insert_font(fontname="F0", fontfile=ttf)
        page.insert_text((50, 300), "Hello Beautiful World", fontname="F0", fontsize=24)
        content = doc.tobytes()
        doc.close()

        from tests.conftest import upload_pdf
        doc_id = upload_pdf(client, pro_headers, content, filename="embedded.pdf")

        response = client.post(
            f"/pdfs/{doc_id}/replace-text",
            headers=pro_headers,
            json={"search": "World", "replace": "Earth"},
        )
        assert response.status_code == status.HTTP_200_OK
        new_id = response.json()["id"]

        dl = client.get(f"/pdfs/{new_id}/download", headers=pro_headers)
        assert dl.status_code == status.HTTP_200_OK
        replaced = fitz.open(stream=dl.content, filetype="pdf")
        spans = []
        for b in replaced[0].get_text("dict").get("blocks", []):
            if b.get("type") != 0:
                continue
            for l in b.get("lines", []):
                for s in l.get("spans", []):
                    spans.append(s)
        replaced.close()

        earth = [s for s in spans if "Earth" in s.get("text", "")]
        assert earth, "Replacement 'Earth' non trovato nell'output"
        span = earth[0]
        # Non deve essere il fallback helv, e la grandezza deve essere preservata
        assert span["font"].lower() != "helv", (
            f"Il font embedded non è stato riusato: font={span['font']!r}"
        )
        assert abs(span["size"] - 24) < 0.5, f"Size {span['size']} non preservata"

    def test_replace_long_word_does_not_overflow_next_words(self, client, pro_headers):
        """Sostituendo una parola corta con una lunga, il testo nuovo NON deve
        straripare sulle parole successive: il fontsize viene ridotto
        (fit-to-width) per stare nello spazio della parola trovata (#1016)."""
        import fitz

        doc = fitz.open()
        page = doc.new_page(width=612, height=792)
        # Parola da sostituire circondata da altre parole sulla stessa riga
        page.insert_text((50, 300), "La parola qui continua la riga", fontname="helv", fontsize=20)
        content = doc.tobytes()
        doc.close()

        src = fitz.open(stream=content, filetype="pdf")
        original_rect = src[0].search_for("qui")[0]
        src.close()

        from tests.conftest import upload_pdf
        doc_id = upload_pdf(client, pro_headers, content, filename="fit.pdf")

        response = client.post(
            f"/pdfs/{doc_id}/replace-text",
            headers=pro_headers,
            json={"search": "qui", "replace": "stabilmente", "occurrence": 1},
        )
        assert response.status_code == status.HTTP_200_OK
        new_id = response.json()["id"]

        dl = client.get(f"/pdfs/{new_id}/download", headers=pro_headers)
        assert dl.status_code == status.HTTP_200_OK
        replaced = fitz.open(stream=dl.content, filetype="pdf")
        long_rects = replaced[0].search_for("stabilmente")
        replaced.close()

        assert long_rects, "La parola lunga non è presente nell'output"
        long_rect = long_rects[0]
        # La parola lunga NON deve superare lo spazio della parola trovata:
        # al massimo una piccola tolleranza (arrotondamenti) oltre il rect.
        assert long_rect.width <= original_rect.width + 4, (
            f"La parola lunga straripa: nuova={long_rect.width:.1f} "
            f"spazio={original_rect.width:.1f}"
        )


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