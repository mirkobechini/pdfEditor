"""T0c — Sicurezza profili: `/mind/chat` espone SOLO il profilo `user`, mai dev."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_chat_rejects_dev_profile(client) -> None:
    """POST /mind/chat con profile=dev → 400: i tool dev NON sono esposti via HTTP."""
    r = client.post("/mind/chat", json={"goal": "stato repo", "profile": "dev"})
    assert r.status_code == 400
    assert "non consentito" in r.json()["detail"]


def test_chat_rejects_unknown_profile(client) -> None:
    """Profilo sconosciuto → 400 (fallback non usato per request esplicita)."""
    r = client.post("/mind/chat", json={"goal": "ciao", "profile": "admin"})
    assert r.status_code == 400


def test_chat_default_profile_is_user_without_llm(client, monkeypatch) -> None:
    """Senza profile esplicito, il default è `user` (profilo sicuro).

    L'agent è sostituito da un fake (nessuna chiamata LLM): verifichiamo solo che
    il guardia profili lasci passare la richiesta (non 400), quindi stream che
    termina subito con [DONE].
    """
    import app.deep_agent.agents.pdfmind as pdfmind_mod
    import app.deep_agent.server.mind as server_mind_mod

    async def fake_events(*args, **kwargs):
        yield '[DONE]'

    monkeypatch.setattr(pdfmind_mod, "build_agent", lambda *a, **k: object())
    monkeypatch.setattr(server_mind_mod, "_events", fake_events)

    r = client.post("/mind/chat", json={"goal": "ciao"})
    assert r.status_code == 200
    assert "[DONE]" in r.text


def test_user_profile_tool_list_has_no_dev() -> None:
    """La tool list del profilo user NON contiene alcun tool dev (per costruzione)."""
    from app.deep_agent.tools.profile import get_tools

    user_tools = get_tools("user")
    names = {getattr(t, "name", getattr(t, "__name__", "")) for t in user_tools}
    assert not (names & {"git_status", "leggi_log", "api_status", "leggi_issue"})
