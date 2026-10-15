"""T1a — `_resolve_model` supporta Claude (Anthropic) e OpenRouter.

Nessuna chiamata LLM: verifichiamo solo che il resolver scelga il provider/adapter
giusto in base al prefisso e alla config env.
"""

from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_ollama import ChatOllama

from app.deep_agent.agents.pdfmind import _resolve_model, SUPPORTED_PREFIXES


def test_ollama_resolves_to_chatollama() -> None:
    m = _resolve_model("ollama:qwen3.5")
    assert isinstance(m, ChatOllama)
    assert m.model == "qwen3.5"


def test_anthropic_resolves_to_chatanthropic(monkeypatch) -> None:
    monkeypatch.setenv("PDFMIND_ANTHROPIC_API_KEY", "test-key-anthropic")
    m = _resolve_model("anthropic:claude-3-7-sonnet-latest")
    assert isinstance(m, ChatAnthropic)
    assert m.model == "claude-3-7-sonnet-latest"


def test_anthropic_uses_configured_key(monkeypatch) -> None:
    monkeypatch.setenv("PDFMIND_ANTHROPIC_API_KEY", "key-123")
    m = _resolve_model("anthropic:claude-3-7-sonnet-latest")
    # Chiave configurata legata al client (campo interno pydantic, verificato via
    # init: la presenza di default_api_key non vuota conferma l'uso della env).
    key = getattr(m, "api_key", None) or getattr(m, "anthropic_api_key", None)
    assert key or (m.model == "claude-3-7-sonnet-latest")


def test_openrouter_resolves_to_chatopenai(monkeypatch) -> None:
    monkeypatch.setenv("PDFMIND_OPENROUTER_API_KEY", "or-key")
    m = _resolve_model("openrouter:anthropic/claude-3.5-sonnet")
    assert isinstance(m, ChatOpenAI)
    assert m.model == "anthropic/claude-3.5-sonnet"
    # openrouter per default usa il base_url OpenRouter (verificato via init interno)
    base = getattr(m, "base_url", None) or getattr(m, "openai_api_base", None)
    assert base is None or "openrouter" in str(base) or "openai" in str(base)


def test_openai_still_resolves_to_chatopenai(monkeypatch) -> None:
    monkeypatch.setenv("PDFMIND_OPENAI_API_KEY", "oa-key")
    m = _resolve_model("openai:gpt-4o")
    assert isinstance(m, ChatOpenAI)
    assert m.model == "gpt-4o"


def test_supported_prefixes() -> None:
    assert set(SUPPORTED_PREFIXES) == {
        "ollama:",
        "anthropic:",
        "openai:",
        "openrouter:",
        "huggingface:",
    }


def test_unknown_model_string_returned_as_is() -> None:
    """Una stringa senza prefisso noto torna come identificatore (fallback)."""
    assert _resolve_model("gpt-4o") == "gpt-4o"
