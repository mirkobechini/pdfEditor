"""T7 — Fix 20/10 (Problema 1+2 dal test C18b):
- dedup: _text salta i ToolMessage (niente elenco workspace doppio)
- conferma merge: _file_confirmation_note inietta NOTA OBBLIGATORIA se l'utente
  scrive un nome file che non esiste esattamente ma ne esiste uno simile.
"""

import os
from pathlib import Path

import pytest

from app.deep_agent.server.mind import _file_confirmation_note, _text


@pytest.fixture()
def ws(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    root = tmp_path
    for n in ("scheda-1726.pdf", "temp.pdf", "Ripassino_Boolean.pdf"):
        (root / n).write_text("x")
    monkeypatch.setenv("PDFMIND_WORKSPACE", str(root))
    return root


# ---- _file_confirmation_note (Problema 2: conferma merge) ----

def test_confirm_underscore_vs_hyphen(ws: Path) -> None:
    note = _file_confirmation_note("unisci scheda_1726 e temp")
    assert note  # deve esserci la nota
    assert "NOTA OBBLIGATORIA" in note
    assert "scheda_1726" in note


def test_confirm_exact_name_no_note(ws: Path) -> None:
    assert _file_confirmation_note("unisci scheda-1726.pdf e temp.pdf") == ""


def test_confirm_no_file_no_note(ws: Path) -> None:
    assert _file_confirmation_note("ciao che file vedi") == ""


def test_confirm_empty(ws: Path) -> None:
    assert _file_confirmation_note("") == ""


def test_confirm_workspace_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("PDFMIND_WORKSPACE", raising=False)
    assert _file_confirmation_note("unisci scheda_1726 e temp") == ""


# ---- _text (Problema 1: niente ToolMessage come testo) ----

class _Msg:
    def __init__(self, type_, content):
        self.type = type_
        self.content = content


def test_text_skips_tool_message() -> None:
    chunk = {"model": {"messages": [_Msg("tool", "output\\scheda-1726_temp_uniti.pdf\nRipassino_Boolean.pdf")]}}
    assert _text(chunk) == ""


def test_text_keeps_ai_message() -> None:
    chunk = {"model": {"messages": [_Msg("ai", "Il workspace contiene i seguenti file:")]}}
    assert _text(chunk) == "Il workspace contiene i seguenti file:"
