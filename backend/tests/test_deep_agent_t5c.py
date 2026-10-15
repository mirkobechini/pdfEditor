"""T5c — tool dell'agente OCR + compress + convert DOCX→PDF (servizi reali)."""

from app.deep_agent.tools import pdf_ops
from app.deep_agent.tools.profile import get_tools


def test_ocr_compress_convert_wired_in_user_profile() -> None:
    """Il profilo user include ocr_pdf, compress_pdf e convert_docx_to_pdf."""
    names = {getattr(t, "__name__", "") for t in get_tools("user")}
    assert "ocr_pdf" in names
    assert "compress_pdf" in names
    assert "convert_docx_to_pdf" in names


def test_ocr_requires_id() -> None:
    out = pdf_ops.ocr_pdf("   ")
    assert "pdf_id" in out.lower() or "errore" in out.lower()


def test_compress_rejects_bad_quality() -> None:
    out = pdf_ops.compress_pdf("abc", quality="ultra")
    assert "quality" in out.lower() or "low" in out.lower()


def test_convert_rejects_non_docx() -> None:
    out = pdf_ops.convert_docx_to_pdf("note.pdf", "aGVsbG8=")
    assert "docx" in out.lower()


def test_convert_requires_content() -> None:
    out = pdf_ops.convert_docx_to_pdf("relazione.docx", "")
    assert "contenuto" in out.lower() or "base64" in out.lower()


def test_convert_rejects_bad_b64() -> None:
    out = pdf_ops.convert_docx_to_pdf("relazione.docx", "!!!not-b64!!!")
    assert "base64" in out.lower() or "valido" in out.lower()


def test_tools_return_strings() -> None:
    assert isinstance(pdf_ops.ocr_pdf("x"), str)
    assert isinstance(pdf_ops.compress_pdf("x"), str)
    assert isinstance(pdf_ops.convert_docx_to_pdf("a.docx", "aGk="), str)
