"""Test difensivi — tool PDF del Deep Agent su FILE FISICI della WORKSPACE.

Issue #1034 (riprodotto da Mirko 24/10): i tool split/sign/annotate/ocr/compress/
convert usavano ancora il DB (PdfService/PdfMergeSplitService) e fallivano con
'PDF not found' per i file presenti solo nella workspace. Ora seguono il pattern
di merge_pdfs: risolvono il file con `_resolve_workspace_pdf_path` e salvano in
output/ (convert_docx_to_pdf salva nella ROOT).

Test deterministici: NIENTE rete, NIENTE DB, workspace su tmp_path con
monkeypatch di app.deep_agent.tools.workspace._root. Per ocr_pdf mockiamo
pytesseract.image_to_string e configure_tesseract così i test girano senza il
binario tesseract.
"""

import base64
import io
from pathlib import Path

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def ws_root(tmp_path, monkeypatch):
    """Workspace su tmp_path + monkeypatch di workspace._root (import lazy)."""
    import app.deep_agent.tools.workspace as ws
    root = tmp_path / "workspace"
    root.mkdir()
    monkeypatch.setattr(ws, "_root", lambda: root)
    return root


def _make_pdf(path: Path, pages: int = 2, text: str = "") -> Path:
    """Crea un PDF reale con fitz (con testo opzionale)."""
    import fitz
    doc = fitz.open()
    for i in range(pages):
        page = doc.new_page()
        if text:
            page.insert_text((72, 100), f"{text} page {i+1}", fontsize=11)
        else:
            # pagina "scansionata" senza testo: disegna solo un rettangolo
            page.draw_rect(fitz.Rect(50, 50, 200, 200))
    path.write_bytes(doc.tobytes())
    doc.close()
    return path


def _make_png_b64() -> str:
    """Un'immagine PNG 1x1 valida in base64 (per sign_pdf)."""
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), (0, 0, 0)).save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def _out(ws_root: Path, *parts: str) -> Path:
    return ws_root.joinpath("output", *parts)


# ---------------------------------------------------------------------------
# split_pdf
# ---------------------------------------------------------------------------

def test_split_every_page_resolves_and_writes_output(ws_root):
    src = _make_pdf(ws_root / "doc.pdf", pages=3)
    from app.deep_agent.tools import pdf_ops
    out = pdf_ops.split_pdf("doc.pdf", mode="every")
    assert out.startswith("✓")
    split_dir = _out(ws_root, "doc-split")
    assert "doc-split" in out  # fix 06/11: cartella dedicata
    parts = sorted(p.name for p in split_dir.iterdir())
    assert parts == ["doc_page_1.pdf", "doc_page_2.pdf", "doc_page_3.pdf"]
    assert split_dir.joinpath("doc_page_1.pdf").exists()
    # round-trip: ogni parte è un PDF valido con 1 pagina
    import fitz
    for p in split_dir.glob("doc_page_*.pdf"):
        d = fitz.open(p)
        assert d.page_count == 1
        d.close()
    assert src.exists()  # sorgente intatto


def test_split_range_resolves_and_writes_output(ws_root):
    _make_pdf(ws_root / "doc.pdf", pages=5)
    from app.deep_agent.tools import pdf_ops
    out = pdf_ops.split_pdf("doc.pdf", mode="range", ranges="1-2,4-5")
    assert out.startswith("✓")
    names = [p.name for p in _out(ws_root, "doc-split").iterdir()]
    assert "doc_pages_1-2.pdf" in names
    assert "doc_pages_4-5.pdf" in names


def test_split_nonexistent_returns_errore(ws_root):
    from app.deep_agent.tools import pdf_ops
    assert pdf_ops.split_pdf("ghost.pdf", mode="every").startswith("Errore:")


def test_split_suffix_on_existing_target(ws_root):
    _make_pdf(ws_root / "doc.pdf", pages=1)
    from app.deep_agent.tools import pdf_ops
    pdf_ops.split_pdf("doc.pdf", mode="every")
    out = pdf_ops.split_pdf("doc.pdf", mode="every")
    assert out.startswith("✓")
    names = sorted(p.name for p in _out(ws_root, "doc-split").iterdir())
    assert "doc_page_1.pdf" in names
    assert "doc_page_1_2.pdf" in names


# ---------------------------------------------------------------------------
# sign_pdf
# ---------------------------------------------------------------------------

def test_sign_pdf_writes_firmato_output(ws_root):
    _make_pdf(ws_root / "doc.pdf", pages=2)
    from app.deep_agent.tools import pdf_ops
    sig = _make_png_b64()
    out = pdf_ops.sign_pdf("doc.pdf", sig, page_number=1, x=300, y=500, width=100, height=40)
    assert out.startswith("✓")
    target = _out(ws_root, "doc_firmato.pdf")
    assert target.exists()
    # round-trip: PDF valido
    import fitz
    d = fitz.open(target)
    assert d.page_count == 2
    d.close()


def test_sign_pdf_nonexistent_returns_errore(ws_root):
    from app.deep_agent.tools import pdf_ops
    out = pdf_ops.sign_pdf("ghost.pdf", _make_png_b64(), page_number=1)
    assert out.startswith("Errore:")


def test_sign_pdf_invalid_image_returns_errore(ws_root):
    _make_pdf(ws_root / "doc.pdf")
    from app.deep_agent.tools import pdf_ops
    out = pdf_ops.sign_pdf("doc.pdf", base64.b64encode(b"not an image").decode(), page_number=1)
    assert out.startswith("Errore:")


# ---------------------------------------------------------------------------
# annotate_pdf
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("atype", ["highlight", "underline", "strikeout", "free_text", "draw"])
def test_annotate_pdf_writes_output(ws_root, atype):
    _make_pdf(ws_root / "doc.pdf", pages=2, text="Testo da annotare")
    from app.deep_agent.tools import pdf_ops
    out = pdf_ops.annotate_pdf(
        "doc.pdf", atype, "72,80,300,120", page_number=1,
        color="#FF0000", content="nota",
    )
    assert out.startswith("✓")
    target = _out(ws_root, "doc_annotato.pdf")
    assert target.exists()
    import fitz
    d = fitz.open(target)
    assert d.page_count == 2
    d.close()


def test_annotate_pdf_nonexistent_returns_errore(ws_root):
    from app.deep_agent.tools import pdf_ops
    out = pdf_ops.annotate_pdf("ghost.pdf", "highlight", "0,0,10,10")
    assert out.startswith("Errore:")


def test_annotate_pdf_bad_color_does_not_crash(ws_root):
    _make_pdf(ws_root / "doc.pdf", pages=1, text="x")
    from app.deep_agent.tools import pdf_ops
    out = pdf_ops.annotate_pdf("doc.pdf", "highlight", "72,80,300,120", color="###nothex###")
    assert out.startswith("✓")


# ---------------------------------------------------------------------------
# ocr_pdf
# ---------------------------------------------------------------------------

def test_ocr_pdf_already_has_text(ws_root, monkeypatch):
    """PDF con testo → 'già dotato di testo', configure_tesseract NON chiamato."""
    _make_pdf(ws_root / "doc.pdf", pages=1, text="Ciao mondo")
    monkeypatch.setattr(
        "app.core.tesseract.configure_tesseract",
        lambda: (_ for _ in ()).throw(AssertionError("non deve essere chiamato")),
    )
    from app.deep_agent.tools import pdf_ops
    out = pdf_ops.ocr_pdf("doc.pdf", language="eng")
    assert "già dotato di testo" in out
    assert _out(ws_root).exists() is False or len(list(_out(ws_root).iterdir())) == 0


def test_ocr_pdf_mocked_flow(ws_root, monkeypatch):
    """PDF senza testo + tesseract mockato → OCR IN-PLACE (stesso file), no copia."""
    _make_pdf(ws_root / "doc.pdf", pages=2)  # pagine "scansionate" senza testo
    monkeypatch.setattr("app.core.tesseract.configure_tesseract", lambda: True)

    def fake_image_to_data(img, lang="eng", config=None, output_type=None):
        # tesseract restituisce parole + bbox (11/11: OCR allineato)
        return {
            "text": ["TEST", "123", "RICONOSCIUTO"],
            "conf": [95, 95, 95],
            "left": [10, 60, 120],
            "top": [10, 10, 30],
            "width": [40, 50, 90],
            "height": [60, 60, 60],
        }

    monkeypatch.setattr("pytesseract.image_to_data", fake_image_to_data)
    from app.deep_agent.tools import pdf_ops
    out = pdf_ops.ocr_pdf("doc.pdf", language="eng")
    assert out.startswith("✓ OCR completato")
    # opzione A (10/11): il risultato è IN-PLACE sullo stesso file, nessun duplicato
    assert "in-place" in out
    target = ws_root / "doc.pdf"
    assert target.exists()
    assert not _out(ws_root, "doc_ocr.pdf").exists()
    # round-trip: PDF valido con testo inserito e con fontsize REALE (>=9pt) così
    # il testo invisibile è cercabile/selezionabile nel viewer (fix 09/11).
    import fitz
    d = fitz.open(target)
    assert d.page_count == 2
    joined = " ".join(d[i].get_text() for i in range(d.page_count))
    for tok in ("TEST", "123", "RICONOSCIUTO"):
        assert tok in joined
    # verifica che il layer usi una dimensione selezionabile, non 1pt
    spans = []
    for pno in range(d.page_count):
        for b in d[pno].get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                for sp in l.get("spans", []):
                    spans.append(sp)
    assert spans, "nessun testo inserito"
    sizes = {round(sp["size"], 1) for sp in spans}
    assert all(sz >= 8.0 for sz in sizes), f"fontsize troppo piccolo: {sizes}"
    d.close()


def test_ocr_pdf_mocked_unavailable(ws_root, monkeypatch):
    """configure_tesseract=False → errore chiaro (binario non installato)."""
    _make_pdf(ws_root / "doc.pdf", pages=1)
    monkeypatch.setattr("app.core.tesseract.configure_tesseract", lambda: False)
    from app.deep_agent.tools import pdf_ops
    out = pdf_ops.ocr_pdf("doc.pdf")
    assert out.startswith("Errore:")
    assert "tesseract" in out.lower() or "ocr" in out.lower()


def test_ocr_pdf_nonexistent_returns_errore(ws_root):
    from app.deep_agent.tools import pdf_ops
    assert pdf_ops.ocr_pdf("ghost.pdf").startswith("Errore:")


# ---------------------------------------------------------------------------
# compress_pdf
# ---------------------------------------------------------------------------

def test_compress_pdf_writes_compressed_output(ws_root):
    _make_pdf(ws_root / "doc.pdf", pages=2, text="contenuto")
    from app.deep_agent.tools import pdf_ops
    out = pdf_ops.compress_pdf("doc.pdf", quality="medium", overwrite=False)
    assert out.startswith("✓")
    target = _out(ws_root, "compressed_doc.pdf")
    assert target.exists()
    assert (ws_root / "doc.pdf").exists()  # originale intatto
    import fitz
    d = fitz.open(target)
    assert d.page_count == 2
    d.close()


def test_compress_pdf_overwrite_replaces_original(ws_root):
    src = _make_pdf(ws_root / "doc.pdf", pages=2, text="contenuto")
    before = src.stat().st_size
    from app.deep_agent.tools import pdf_ops
    out = pdf_ops.compress_pdf("doc.pdf", quality="high", overwrite=True)
    assert out.startswith("✓")
    assert src.exists()
    # il file originale ora è il compresso (dimensioni tipicamente più piccole)
    import fitz
    d = fitz.open(src)
    assert d.page_count == 2
    d.close()


def test_compress_pdf_nonexistent_returns_errore(ws_root):
    from app.deep_agent.tools import pdf_ops
    assert pdf_ops.compress_pdf("ghost.pdf").startswith("Errore:")


# ---------------------------------------------------------------------------
# convert_docx_to_pdf
# ---------------------------------------------------------------------------

def _make_docx_b64(text: str = "Relazione di test\nSecondo capoverso") -> str:
    from docx import Document
    buf = io.BytesIO()
    doc = Document()
    for line in text.split("\n"):
        doc.add_paragraph(line)
    doc.save(buf)
    return base64.b64encode(buf.getvalue()).decode()


def test_convert_docx_to_pdf_writes_to_workspace_root(ws_root):
    from app.deep_agent.tools import pdf_ops
    out = pdf_ops.convert_docx_to_pdf("relazione.docx", _make_docx_b64())
    assert out.startswith("✓")
    target = ws_root / "relazione.pdf"
    assert target.exists()  # ROOT della workspace, non output/
    # round-trip: PDF valido con il testo
    import fitz
    d = fitz.open(target)
    txt = " ".join(d[i].get_text() for i in range(d.page_count))
    assert "Relazione di test" in txt
    d.close()


def test_convert_docx_suffix_on_existing(ws_root):
    from app.deep_agent.tools import pdf_ops
    pdf_ops.convert_docx_to_pdf("doc.docx", _make_docx_b64())
    out = pdf_ops.convert_docx_to_pdf("doc.docx", _make_docx_b64())
    assert out.startswith("✓")
    assert (ws_root / "doc.pdf").exists()
    assert (ws_root / "doc_2.pdf").exists()


def test_convert_docx_nonexistent_workspace(tmp_path, monkeypatch):
    import app.deep_agent.tools.workspace as ws
    monkeypatch.setattr(ws, "_root", lambda: None)
    from app.deep_agent.tools import pdf_ops
    assert "Errore" in pdf_ops.convert_docx_to_pdf("x.docx", _make_docx_b64())


def test_convert_docx_invalid_content_returns_errore(ws_root):
    from app.deep_agent.tools import pdf_ops
    # contenuto base64 valido ma NON un docx
    out = pdf_ops.convert_docx_to_pdf("x.docx", base64.b64encode(b"not a docx").decode())
    assert out.startswith("Errore:")

# ---------------------------------------------------------------------------
# fix 06/11 (Mirko, build 24/10): firma da FILE del workspace + evidenzia automatica
# ---------------------------------------------------------------------------

def test_sign_pdf_da_file_workspace(ws_root):
    """signature_file: l'immagine firma viene letta dal workspace (es. firma.png)."""
    _make_pdf(ws_root / "doc.pdf", pages=1)
    (ws_root / "firma.png").write_bytes(base64.b64decode(_make_png_b64()))
    from app.deep_agent.tools import pdf_ops
    out = pdf_ops.sign_pdf("doc.pdf", signature_file="firma.png", page_number=1)
    assert out.startswith("✓"), out
    assert _out(ws_root, "doc_firmato.pdf").exists()


def test_sign_pdf_da_file_manca_errore(ws_root):
    """signature_file inesistente → Errore chiaro (prima: 'elencato ma non accessibile')."""
    _make_pdf(ws_root / "doc.pdf", pages=1)
    from app.deep_agent.tools import pdf_ops
    out = pdf_ops.sign_pdf("doc.pdf", signature_file="firma_mancante.png", page_number=1)
    assert out.startswith("Errore:"), out
    assert "non trovata" in out


def test_annotate_search_text_evidenzia_tutte_le_occorrenze(ws_root):
    """search_text: trova e evidenzia TUTTE le occorrenze senza coordinate manuali."""
    _make_pdf(ws_root / "doc.pdf", pages=3, text="Mezzani appare qui e anche Mezzani dopo")
    from app.deep_agent.tools import pdf_ops
    out = pdf_ops.annotate_pdf("doc.pdf", "highlight", search_text="Mezzani")
    assert out.startswith("✓"), out
    assert "2 occorrenze" in out
    target = _out(ws_root, "doc_annotato.pdf")
    assert target.exists()
    import fitz
    d = fitz.open(target)
    # ci devono essere le annotazioni highlight
    total = sum(len(list(p.annots() or [])) for p in d)
    assert total >= 2, f"attese >=2 annotazioni, trovate {total}"
    d.close()


def test_annotate_search_text_non_trovato(ws_root):
    _make_pdf(ws_root / "doc.pdf", pages=1, text="Testo qualunque")
    from app.deep_agent.tools import pdf_ops
    out = pdf_ops.annotate_pdf("doc.pdf", "highlight", search_text="inesistenteXYZ")
    assert out.startswith("Errore:"), out
    assert "non trovato" in out


def test_annotate_search_text_solo_con_highlight(ws_root):
    _make_pdf(ws_root / "doc.pdf", pages=1, text="x")
    from app.deep_agent.tools import pdf_ops
    out = pdf_ops.annotate_pdf("doc.pdf", "underline", search_text="x")
    assert out.startswith("Errore:"), out


def test_resolver_not_found_elenca_i_pdf_disponibili(ws_root):
    """09/11 (Mirko): un PDF inesistente deve dire quali PDF ci sono, non solo 'not found'."""
    from app.deep_agent.tools import pdf_ops
    _make_pdf(ws_root / "report.pdf", pages=1, text="x")
    _make_pdf(ws_root / "nota.pdf", pages=1, text="y")
    out = pdf_ops.ocr_pdf("ghost.pdf")
    assert "Errore:" in out
    assert "not found" in out
    assert "report.pdf" in out and "nota.pdf" in out


def test_ocr_resolve_dalla_workspace_non_dal_backend(ws_root):
    """09/11: l'OCR opera sul FILE FISICO della workspace (non su pdf_documents)."""
    from app.deep_agent.tools import pdf_ops
    _make_pdf(ws_root / "doc.pdf", pages=1, text="Ciao")
    # un file fisico che NON esiste nel backend ma esiste nel workspace deve essere
    # riconosciuto come 'già dotato di testo' (prova che risolve dal filesystem)
    out = pdf_ops.ocr_pdf("doc.pdf")
    assert "già dotato di testo" in out


def test_ocr_default_lingua_italiana():
    """11/11 (Mirko): l'OCR di default usa l'italiano ('ita'), non 'eng'."""
    import inspect
    from app.deep_agent.tools import pdf_ops
    from app.services import pdf_service_mutate as mut

    assert inspect.signature(pdf_ops.ocr_pdf).parameters["language"].default == "ita"
    assert inspect.signature(mut.PdfServiceMutateMixin.ocr_pdf).parameters["language"].default == "ita"
