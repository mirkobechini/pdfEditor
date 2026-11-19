"""Fix 15/10 punti 8+10 — elenco modelli Ollama e test connessione."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_ollama_models_route_returns_list(client) -> None:
    """GET /mind/ollama/models → del formato {models:[], ok:bool} (mai errori lanciati)."""
    r = client.get("/mind/ollama/models")
    assert r.status_code == 200
    body = r.json()
    assert "models" in body
    assert isinstance(body["models"], list)
    assert "ok" in body


def test_ollama_test_route_returns_ok_or_fail(client) -> None:
    """GET type check: /mind/test (POST) gestisce ollemma locale e cloud."""
    r = client.post("/mind/test", json={"provider": "ollama", "model": "qwen3.5"})
    assert r.status_code == 200
    body = r.json()
    assert "ok" in body
    assert "message" in body


def test_cloud_test_requires_key(client, monkeypatch) -> None:
    """Provider cloud senza key → ok:false con messaggio chiaro (non crasha)."""
    monkeypatch.delenv("PDFMIND_ANTHROPIC_API_KEY", raising=False)
    r = client.post("/mind/test", json={"provider": "anthropic", "model": "claude-3-7-sonnet-latest"})
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is False
    assert "chiave" in body["message"].lower() or "key" in body["message"].lower()
