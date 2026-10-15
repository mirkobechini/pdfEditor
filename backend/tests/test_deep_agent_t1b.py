"""T1b — resolver supporta Hugging Face (e conferma OpenAI).

Nessuna chiamata LLM: solo verifica che il resolver scelga l'adapter giusto.
HF Inference è OpenAI-compatible → ChatOpenAI su https://api-inference.huggingface.co/v1.
"""

from langchain_openai import ChatOpenAI

from app.deep_agent.agents.pdfmind import _resolve_model, SUPPORTED_PREFIXES


def test_huggingface_resolves_to_chatopenai(monkeypatch) -> None:
    monkeypatch.setenv("PDFMIND_HF_API_KEY", "hf-key")
    m = _resolve_model("huggingface:meta-llama/Llama-3.2-3B-Instruct")
    assert isinstance(m, ChatOpenAI)
    assert m.model == "meta-llama/Llama-3.2-3B-Instruct"


def test_huggingface_default_base_url(monkeypatch) -> None:
    """HF per default usa l'endpoint Inference (base URL non vuoto)."""
    monkeypatch.setenv("PDFMIND_HF_API_KEY", "hf-key")
    m = _resolve_model("huggingface:meta-llama/Llama-3.2-3B-Instruct")
    base = getattr(m, "base_url", None) or getattr(m, "openai_api_base", None)
    assert base  # risolto a un endpoint (interno pydantic), non stringa vuota


def test_openai_with_configured_key(monkeypatch) -> None:
    monkeypatch.setenv("PDFMIND_OPENAI_API_KEY", "oa-key")
    m = _resolve_model("openai:gpt-4o")
    assert isinstance(m, ChatOpenAI)
    assert m.model == "gpt-4o"


def test_all_providers_supported() -> None:
    assert set(SUPPORTED_PREFIXES) == {
        "ollama:",
        "anthropic:",
        "openai:",
        "openrouter:",
        "huggingface:",
    }
