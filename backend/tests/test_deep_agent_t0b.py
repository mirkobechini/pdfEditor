"""T0b — rotte `/mind` montate nel backend (router dedicato, non ancora in UI)."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_mind_health_route_exposed(client) -> None:
    """GET /mind/health risponde 200 senza richiedere LLM né modelli."""
    r = client.get("/mind/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["engine"] == "deep_agent"
    assert body["profile"] == "user"


def test_mind_config_route_default_user(client) -> None:
    """GET /mind/config espone la config pubblica (senza chiavi) del profilo user.

    Fix 16/10 (esito build 3287e4b): al primo ingresso NESSUN provider preselezionato
    — il default diventa stringa vuota (il config UI mostra il placeholder
    "Seleziona provider"). L'agent runtime ricade comunque su Ollama.
    """
    r = client.get("/mind/config")
    assert r.status_code == 200
    body = r.json()
    assert "provider" in body
    assert body["provider"] == ""
    assert "api_key" not in body


def test_mind_route_rejects_wrong_method(client) -> None:
    """Le rotte /mind non accettano metodi non definiti (es. DELETE su /health)."""
    r = client.delete("/mind/health")
    assert r.status_code == 405


def test_mind_chat_requires_goal(client) -> None:
    """POST /mind/chat senza `goal` → 422 (validazione pydantic), nessuna chiamata LLM."""
    r = client.post("/mind/chat", json={})
    assert r.status_code == 422
