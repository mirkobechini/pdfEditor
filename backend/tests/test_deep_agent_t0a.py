"""T0a — motore Deep Agent (ex pdfmind) portato in backend, import funzionanti, INATTIVO.

Nessuna rotta mappata in main.py in questa tranche: verifico solo che il motore
si importi e si costruisca senza chiamare alcun LLM (mock / nessuna chiamata).
"""

import importlib
import sys

import pytest

sys.path.insert(0, __file__.rsplit("/", 1)[0])

MODULES = [
    "app.deep_agent.agents.pdfmind",
    "app.deep_agent.tools.docs",
    "app.deep_agent.tools.workspace",
    "app.deep_agent.tools.profile",
]


@pytest.mark.parametrize("mod", MODULES)
def test_module_imports(mod: str) -> None:
    """Ogni modulo portato da pdfmind deve importarsi senza errori."""
    importlib.import_module(mod)


def test_build_agent_user_profile_no_llm_call() -> None:
    """La costruzione dell'agente col profilo user NON chiama nessun LLM."""
    from app.deep_agent.agents.pdfmind import build_agent

    agent = build_agent(model="ollama:qwen3.5", profile="user")
    assert agent is not None


def test_user_profile_has_no_dev_tools() -> None:
    """Profilo user: i tool dev NON esistono per costruzione (sicurezza ADR)."""
    from app.deep_agent.tools.profile import get_tools

    user_tools = get_tools("user")
    names = {getattr(t, "name", getattr(t, "__name__", "")) for t in user_tools}
    dev_only = {"git_status", "leggi_log", "api_status", "leggi_issue"}
    assert not (names & dev_only), f"tool dev esposti nel profilo user: {names & dev_only}"


def test_dev_profile_has_more_tools() -> None:
    """Profilo dev: include i tool dev (documenti + manutenzione)."""
    from app.deep_agent.tools.profile import get_tools

    dev_tools = get_tools("dev")
    names = {getattr(t, "name", getattr(t, "__name__", "")) for t in dev_tools}
    assert {"git_status", "leggi_log", "api_status", "leggi_issue"} <= names


def test_workspace_tool_path_guard(tmp_path, monkeypatch) -> None:
    """scrivi_output scrive SOLO in output/ e rifiuta percorsi fuori workspace."""
    import os
    from pathlib import Path

    import app.deep_agent.tools.workspace as ws

    monkeypatch.setenv("PDFMIND_WORKSPACE", str(tmp_path))
    # re-import module to pick env
    importlib.reload(ws)

    out = ws.scrivi_output("prova.txt", "ciao")
    assert "scritto" in out
    assert (tmp_path / "output" / "prova.txt").read_text() == "ciao"

    evil = ws.scrivi_output("../fuori.txt", "x")
    assert "non consentita" in evil
    assert not (tmp_path.parent / "fuori.txt").exists()


def test_docs_tool_reads_pdf_or_text(tmp_path, monkeypatch) -> None:
    """leggi_pdf/elenca_file funzionano su testo e PDF (pypdf presente)."""
    from pathlib import Path

    import app.deep_agent.tools.docs as docs

    monkeypatch.setenv("PDFMIND_WORKSPACE", str(tmp_path))
    (tmp_path / "nota.txt").write_text("riga 12/10/2026", encoding="utf-8")

    listing = docs.elenca_file(str(tmp_path))
    assert "nota.txt" in listing

    dates = docs.estrai_date("nota.txt")
    assert "12/10/2026" in dates
