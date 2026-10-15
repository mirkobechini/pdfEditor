"""Deep Agent — config persistita in locale (T3a).

Le chiavi dell'utente e la config (provider, modello, workspace, RAG on/off)
vengono salvate in un file JSON LOCALE nella cartella dati dell'app. Mai sul
cloud. Il file non è mai esposto via API in chiaro: il GET restituisce la
config senza ritornare le chiavi scritte.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from app.core.config import _get_app_data_dir

CONFIG_FILE = "deep_agent_config.json"

DEFAULTS: dict = {
    "provider": "ollama",          # ollama | anthropic | openai | openrouter | huggingface
    "model": "qwen3.5",
    "workspace": "workspace",
    "rag_enabled": True,
    "streaming": True,
    # le chiavi sono salvate ma mai lette fuori da questo modulo
    "api_key": "",
}


def _config_path() -> Path:
    return _get_app_data_dir() / CONFIG_FILE


def load() -> dict:
    """Carica la config locale; se mancante usa i default e NON la crea il file."""
    p = _config_path()
    if not p.exists():
        return dict(DEFAULTS)
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        merged = dict(DEFAULTS)
        merged.update(data or {})
        return merged
    except (OSError, ValueError):
        return dict(DEFAULTS)


def save(cfg: dict) -> None:
    """Persiste la config (parziale) sul file locale, preservando i default."""
    current = load()
    # accetta solo campi noti
    for k in DEFAULTS:
        if k in cfg:
            current[k] = cfg[k]
    current["api_key"] = cfg.get("api_key", current.get("api_key", "")) or ""
    p = _config_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding="utf-8")


def public(cfg: dict | None = None) -> dict:
    """Rappresentazione per il client: MAI le chiavi."""
    c = dict(cfg or load())
    c.pop("api_key", None)
    c["has_api_key"] = bool((cfg or load()).get("api_key")) or c.get("provider") == "ollama"
    return c


def env_for(provider: str) -> dict:
    """Mappa provider → variabile d'ambiente per la key (usata dal resolver)."""
    return {
        "ollama": "PDFMIND_OLLAMA_URL",
        "anthropic": "PDFMIND_ANTHROPIC_API_KEY",
        "openai": "PDFMIND_OPENAI_API_KEY",
        "openrouter": "PDFMIND_OPENROUTER_API_KEY",
        "huggingface": "PDFMIND_HF_API_KEY",
    }.get(provider, "")
