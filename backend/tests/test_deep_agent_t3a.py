"""T3a — config Deep Agent: store locale + endpoint /mind/config (GET/PUT).

Le chiavi sono salvate in locale e MAI restituite in GET.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_config_public_never_returns_api_key(monkeypatch, tmp_path) -> None:
    from app.deep_agent import config as dc

    monkeypatch.setattr(dc, "_get_app_data_dir", lambda: tmp_path)
    dc.save({"provider": "openai", "model": "gpt-4o", "api_key": "sk-secret-123"})
    pub = dc.public(dc.load())
    assert "api_key" not in pub
    assert pub["provider"] == "openai"
    assert pub["model"] == "gpt-4o"


def test_config_save_preserves_defaults_and_missing(monkeypatch, tmp_path) -> None:
    from app.deep_agent import config as dc

    monkeypatch.setattr(dc, "_get_app_data_dir", lambda: tmp_path)
    dc.save({"provider": "anthropic"})  # parziale
    cfg = dc.load()
    assert cfg["provider"] == "anthropic"
    assert cfg["rag_enabled"] is True  # default preservato
    assert cfg["streaming"] is True


def test_config_load_missing_returns_defaults(monkeypatch, tmp_path) -> None:
    from app.deep_agent import config as dc

    monkeypatch.setattr(dc, "_get_app_data_dir", lambda: tmp_path)
    assert dc.load()["provider"] == "ollama"


def test_env_for_provider() -> None:
    from app.deep_agent import config as dc

    assert dc.env_for("anthropic") == "PDFMIND_ANTHROPIC_API_KEY"
    assert dc.env_for("openrouter") == "PDFMIND_OPENROUTER_API_KEY"
    assert dc.env_for("huggingface") == "PDFMIND_HF_API_KEY"


def test_mind_config_get_returns_public_no_key(client, monkeypatch, tmp_path) -> None:
    from app.deep_agent import config as dc

    monkeypatch.setattr(dc, "_get_app_data_dir", lambda: tmp_path)
    dc.save({"provider": "openai", "api_key": "sk-xyz"})
    r = client.get("/mind/config")
    assert r.status_code == 200
    body = r.json()
    assert "api_key" not in body
    assert body["provider"] == "openai"


def test_mind_config_put_persists(client, monkeypatch, tmp_path) -> None:
    from app.deep_agent import config as dc

    monkeypatch.setattr(dc, "_get_app_data_dir", lambda: tmp_path)
    r = client.put("/mind/config", json={"provider": "ollama", "model": "qwen3.5", "rag_enabled": False})
    assert r.status_code == 200
    assert r.json()["rag_enabled"] is False
    # persistito su disco
    assert dc.load()["model"] == "qwen3.5"
