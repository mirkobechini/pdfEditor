"""T5a — tool dell'agente split/merge che avvolgono i servizi reali del backend."""

from app.deep_agent.tools import pdf_ops
from app.deep_agent.tools.profile import get_tools


def test_pdf_ops_tools_wired_in_user_profile() -> None:
    """Il profilo user ora include split_pdf e merge_pdfs (tool dell'app)."""
    names = {getattr(t, "__name__", "") for t in get_tools("user")}
    assert "split_pdf" in names
    assert "merge_pdfs" in names


def test_split_pdf_requires_ranges_in_range_mode() -> None:
    """mode='range' senza ranges → messaggio di errore coerente, nessuna eccezione."""
    out = pdf_ops.split_pdf("abc", mode="range", ranges=None)
    assert "range" in out.lower()


def test_merge_pdfs_requires_at_least_two() -> None:
    """merge con 1 solo id → messaggio di errore coerente."""
    out = pdf_ops.merge_pdfs("solo-uno")
    assert "2" in out or "almeno" in out.lower()


def test_merge_pdfs_empty_ids() -> None:
    out = pdf_ops.merge_pdfs("   ")
    assert "almeno 2" in out.lower()


def test_tools_return_strings_without_objects() -> None:
    """I tool dell'agente restituiscono sempre stringhe (mai oggetti)."""
    assert isinstance(pdf_ops.split_pdf("x", mode="every"), str)
    assert isinstance(pdf_ops.merge_pdfs("a,b"), str)
