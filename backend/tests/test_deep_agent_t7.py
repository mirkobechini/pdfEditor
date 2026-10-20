"""T7 — Punto 1 (HITL nativo) + Punto 2 (streaming v2).

- conferma merge: il workaround testuale _file_confirmation_note è stato RIMOSSO.
  La conferma dei nomi file ora passa dall'HITL nativo: il predicato `when`
  (_needs_filename_confirmation in agents/pdfmind.py) ferma il tool SOLO se un
  nome PDF referenziato non combacia esattamente coi file reali ma ne esiste uno
  simile (es. 'scheda_1726' vs 'scheda-1726.pdf').
- streaming v2: i parser del server (mind.py) leggono il formato Pregel v2
  (chunk['data'] + interrupt nativi in chunk['interrupts']).
"""

import pytest

from app.deep_agent.agents.pdfmind import _needs_filename_confirmation
from app.deep_agent.server.mind import _interrupt_name, _stable_thread_id, _text


@pytest.fixture()
def ws(tmp_path, monkeypatch: pytest.MonkeyPatch) -> "object":
    for n in ("scheda-1726.pdf", "temp.pdf", "Ripassino_Boolean.pdf"):
        (tmp_path / n).write_text("x")
    monkeypatch.setenv("PDFMIND_WORKSPACE", str(tmp_path))
    return tmp_path


# ---- _needs_filename_confirmation (predicato `when` dell'HITL nativo) ----

class _Req:
    """Finto ToolCallRequest con tool_call (dict) come in deepagents 0.7.19."""

    def __init__(self, name: str, args: dict):
        self.tool_call = {"name": name, "args": args, "id": "1", "type": "tool_call"}


def _req(name: str, args: dict):
    return _Req(name, args)


def test_confirm_underscore_vs_hyphen(ws) -> None:
    """'scheda_1726' non esatto ma simile a 'scheda-1726.pdf' -> interrupt."""
    assert _needs_filename_confirmation(_req("merge_pdfs", {"pdf_ids": "scheda_1726,temp"})) is True


def test_confirm_exact_name_no_interrupt(ws) -> None:
    """Nomi esatti -> niente conferma (il tool gira da solo)."""
    assert _needs_filename_confirmation(_req("merge_pdfs", {"pdf_ids": "scheda-1726.pdf,temp.pdf"})) is False


def test_no_file_mentioned_no_interrupt(ws) -> None:
    assert _needs_filename_confirmation(_req("merge_pdfs", {"pdf_ids": "non-esiste.pdf,altro.pdf"})) is False


def test_non_operating_tool_never_interrupts(ws) -> None:
    """Un tool non in _CONFIRM_TOOLS (es. elenca_workspace) non viene mai fermato."""
    assert _needs_filename_confirmation(_req("elenca_workspace", {})) is False


def test_other_operating_tools_checked(ws) -> None:
    """Anche split/sign/etc. usano lo stesso predicato (es. split_pdf)."""
    assert _needs_filename_confirmation(_req("split_pdf", {"pdf_id": "scheda_1726"})) is True
    assert _needs_filename_confirmation(_req("split_pdf", {"pdf_id": "scheda-1726.pdf"})) is False


def test_workspace_missing_no_interrupt(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("PDFMIND_WORKSPACE", raising=False)
    assert _needs_filename_confirmation(_req("merge_pdfs", {"pdf_ids": "scheda_1726,temp"})) is False


# ---- _text (Problema 1: niente ToolMessage come testo) ----

class _Msg:
    def __init__(self, type_, content):
        self.type = type_
        self.content = content


def _v2(data: dict, interrupts=()):
    return {"type": "values", "ns": [], "data": data, "interrupts": interrupts}


def test_text_skips_tool_message() -> None:
    # con stream_mode='values' v2 lo stato è appiattito (data.messages), non più
    # annidato sotto model/tools: la forma reale è _v2({"messages": [...]})
    chunk = _v2({"messages": [_Msg("tool", "output\\scheda-1726_temp_uniti.pdf\nRipassino_Boolean.pdf")]})
    assert _text(chunk) == ""


def test_text_keeps_ai_message() -> None:
    chunk = _v2({"messages": [_Msg("ai", "Il workspace contiene i seguenti file:")]})
    assert _text(chunk) == "Il workspace contiene i seguenti file:"


# ---- _stable_thread_id (Punto 5: thread_id stabile per sessione) ----

def test_thread_id_stable_per_user() -> None:
    """Stesso user_id -> stesso thread (derivazione stabile)."""
    assert _stable_thread_id("user-1") == _stable_thread_id("user-1")
    assert _stable_thread_id("user-1") != _stable_thread_id("user-2")


def test_thread_id_prefers_client_thread() -> None:
    assert _stable_thread_id("user-1", "my-thread") == "my-thread"


def test_thread_id_anonymous_random() -> None:
    """Senza user_id e senza thread client -> uuid casuale (mai lo stesso)."""
    assert _stable_thread_id(None) != _stable_thread_id(None)


# ---- _interrupt_name (HITL nativo in streaming v2) ----

class _Inter:
    value = {"action_requests": [{"name": "merge_pdfs"}]}


def test_interrupt_name_v2() -> None:
    chunk = _v2({"messages": []}, (_Inter(),))
    assert _interrupt_name(chunk) == "merge_pdfs"


def test_interrupt_name_empty() -> None:
    assert _interrupt_name(_v2({"messages": []})) is None
