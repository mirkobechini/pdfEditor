"""Punto 7 — multi-provider con precedenza e fallback (config + resolver)."""

import pytest

from app.deep_agent import config as dc
from app.deep_agent.agents.pdfmind import resolve_primary_model, _resolve_model
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI


@pytest.fixture()
def isolated_config(tmp_path, monkeypatch):
    """Config isolata su tmp_path (non tocca il file reale)."""
    monkeypatch.setattr(dc, "_config_path", lambda: tmp_path / "conf.json")
    return dc


def test_ordered_providers_old_style(isolated_config) -> None:
    """Config vecchia (solo provider+model top-level) → una sola voce usable."""
    isolated_config.save({"provider": "ollama", "model": "qwen3.5"})
    pro = isolated_config.ordered_providers()
    assert len(pro) == 1
    assert pro[0]["provider"] == "ollama"
    assert pro[0]["model"] == "qwen3.5"


def test_ordered_providers_multiple_precedence(isolated_config) -> None:
    """Lista providers rispetta l'ordine (indice 0 = massima priorità)."""
    isolated_config.save(
        {
            "providers": [
                {"provider": "ollama", "model": "qwen3.5", "api_key": "", "enabled": True},
                {"provider": "openai", "model": "gpt-4o", "api_key": "sk-123", "enabled": True},
            ],
            "fallback_enabled": True,
        }
    )
    pro = isolated_config.ordered_providers()
    assert [p["provider"] for p in pro] == ["ollama", "openai"]


def test_public_providers_hides_keys(isolated_config) -> None:
    """GET /config: providers senza api_key ma con has_api_key."""
    isolated_config.save(
        {
            "providers": [
                {"provider": "ollama", "model": "q", "api_key": "", "enabled": True},
                {"provider": "anthropic", "model": "cl", "api_key": "ak-123", "enabled": True},
            ]
        }
    )
    pub = isolated_config.public()
    for p in pub["providers"]:
        assert "api_key" not in p
        assert "has_api_key" in p
    assert pub["providers"][1]["has_api_key"] is True


def test_fallback_enabled_default_true(isolated_config) -> None:
    assert isolated_config.fallback_enabled() is True


def test_resolve_primary_prefers_first_enabled(isolated_config) -> None:
    """Resolver sceglie il primo provider usable (precedenza)."""
    isolated_config.save(
        {
            "providers": [
                {"provider": "ollama", "model": "qwen3.5", "api_key": "", "enabled": True},
                {"provider": "openai", "model": "gpt-4o", "api_key": "sk-123", "enabled": True},
            ]
        }
    )
    model = resolve_primary_model()
    assert isinstance(model, ChatOllama)


def test_resolve_primary_skips_disabled_or_no_key(isolated_config) -> None:
    """Se il primo provider non è usable (disabilitato/senza key), scende al successivo."""
    isolated_config.save(
        {
            "providers": [
                {"provider": "openai", "model": "gpt-4o", "api_key": "", "enabled": True},  # no key → skip
                {"provider": "anthropic", "model": "claude", "api_key": "ak", "enabled": True},
            ]
        }
    )
    model = resolve_primary_model()
    from langchain_anthropic import ChatAnthropic
    assert isinstance(model, ChatAnthropic)


def test_resolve_model_openai_and_ollama(monkeypatch) -> None:
    monkeypatch.setenv("PDFMIND_OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("PDFMIND_OPENROUTER_API_KEY", "or-test")
    monkeypatch.setenv("PDFMIND_HF_API_KEY", "hf-test")
    assert isinstance(_resolve_model("ollama:qwen3.5"), ChatOllama)
    assert isinstance(_resolve_model("openai:gpt-4o"), ChatOpenAI)
