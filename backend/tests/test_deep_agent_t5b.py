"""T5b — tool dell'agente sign + annotate/highlight che avvolgono servizi reali."""

from app.deep_agent.tools import pdf_ops
from app.deep_agent.tools.profile import get_tools


def test_sign_and_annotate_wired_in_user_profile() -> None:
    """Il profilo user include sign_pdf e annotate_pdf."""
    names = {getattr(t, "__name__", "") for t in get_tools("user")}
    assert "sign_pdf" in names
    assert "annotate_pdf" in names


def test_sign_pdf_requires_image() -> None:
    out = pdf_ops.sign_pdf("abc", signature_image_b64="", page_number=1)
    assert "firma" in out.lower()


def test_sign_pdf_validates_page_and_dims() -> None:
    out = pdf_ops.sign_pdf("abc", signature_image_b64="aGk=", page_number=0)
    assert "page" in out.lower()
    out2 = pdf_ops.sign_pdf("abc", signature_image_b64="aGk=", page_number=1, width=0)
    assert "width" in out2.lower()


def test_sign_pdf_rejects_bad_b64() -> None:
    out = pdf_ops.sign_pdf("abc", signature_image_b64="!!!not-b64!!!", page_number=1)
    assert "base64" in out.lower() or "firma" in out.lower()


def test_annotate_rejects_invalid_type() -> None:
    out = pdf_ops.annotate_pdf("abc", annotation_type="circle", rect="0,0,10,10")
    assert "non valido" in out.lower()


def test_annotate_validates_rect() -> None:
    out = pdf_ops.annotate_pdf("abc", annotation_type="highlight", rect="1,2,3")
    assert "4" in out or "rect" in out.lower()
    out2 = pdf_ops.annotate_pdf("abc", annotation_type="highlight", rect="x,y,z,w")
    assert "rect" in out2.lower()


def test_tools_return_strings() -> None:
    assert isinstance(pdf_ops.sign_pdf("x", signature_image_b64="aGk=", page_number=1), str)
    assert isinstance(pdf_ops.annotate_pdf("x", annotation_type="highlight", rect="0,0,1,1"), str)
