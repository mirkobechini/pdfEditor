"""Deep Agent — config persistita in locale (T3a + punto 7 multi-provider).

Le chiavi dell'utente e la config (provider, modello, workspace, RAG on/off)
vengono salvate in un file JSON LOCALE nella cartella dati dell'app. Mai sul
cloud. Il file non è mai esposto via API in chiaro: il GET restituisce la
config senza ritornare le chiavi scritte.

Punto 7 (Mirko 15/10): si possono configurare PIÙ provider insieme (es. uno
offline + uno online), ognuno con la sua key, con una PRECEDENZA (ordine
nella lista `providers`, il primo ha priorità) e un FALLBACK (se il primo non
è raggiungibile, si passa al successivo). I campi `provider`/`model`/`api_key`
restano come "selezione attiva" (retro-compat e wizard), ma la fonte di verità
per la precedenza è `providers`.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from app.core.config import _get_app_data_dir

CONFIG_FILE = "deep_agent_config.json"

DEFAULTS: dict = {
    "provider": "ollama",          # selezione attiva: ollama | anthropic | openai | openrouter | huggingface
    "model": "qwen3.5",
    "workspace": "workspace",
    "rag_enabled": True,
    "streaming": True,
    # le chiavi sono salvate ma mai lette fuori da questo modulo
    "api_key": "",
    # Punto 7: lista ordinata di provider (indice 0 = massima priorità).
    # Ogni voce: {"provider": str, "model": str, "api_key": str, "enabled": bool}
    "providers": [],
    "fallback_enabled": True,
}

VALID_PROVIDERS = {"ollama", "anthropic", "openai", "openrouter", "huggingface"}


def _config_path() -> Path:
    return _get_app_data_dir() / CONFIG_FILE


def _sanitize_provider(provider: str | None) -> str:
    if provider and provider in VALID_PROVIDERS:
        return provider
    return "ollama"


def _normalize(cfg: dict) -> dict:
    merged = dict(DEFAULTS)
    merged.update(cfg or {})
    merged["provider"] = _sanitize_provider(merged.get("provider"))
    merged["model"] = str(merged.get("model", "") or "")
    merged["rag_enabled"] = bool(merged.get("rag_enabled", True))
    merged["streaming"] = bool(merged.get("streaming", True))
    merged["fallback_enabled"] = bool(merged.get("fallback_enabled", True))
    # providers: garantisci forma corretta e validi i provider
    providers = merged.get("providers")
    if not isinstance(providers, list):
        providers = []
    clean = []
    for p in providers:
        if not isinstance(p, dict):
            continue
        prov = _sanitize_provider(p.get("provider"))
        clean.append(
            {
                "provider": prov,
                "model": str(p.get("model", "") or ""),
                "api_key": str(p.get("api_key", "") or ""),
                "enabled": bool(p.get("enabled", True)),
            }
        )
    merged["providers"] = clean
    return merged


def load() -> dict:
    """Carica la config locale; se mancante usa i default e NON la crea il file."""
    p = _config_path()
    if not p.exists():
        return _normalize(DEFAULTS)
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        return _normalize(data or {})
    except (OSError, ValueError):
        return _normalize(DEFAULTS)


def save(cfg: dict) -> None:
    """Persiste la config (parziale) sul file locale, preservando i default."""
    current = load()
    for k in DEFAULTS:
        if k in cfg:
            current[k] = cfg[k]
    # chiave attiva presente? salvala
    if "api_key" in cfg:
        current["api_key"] = cfg.get("api_key") or current.get("api_key", "")
    # se è arrivata una lista providers, normalizzala
    if "providers" in cfg:
        current["providers"] = _normalize({"providers": cfg["providers"]})["providers"]
    current = _normalize(current)
    p = _config_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding="utf-8")


def public(cfg: dict | None = None) -> dict:
    """Rappresentazione per il client: MAI le chiavi."""
    c = dict(cfg or load())
    c.pop("api_key", None)
    # rimuovi le key dalla lista providers, aggiungi has_api_key per voce
    provs = []
    for p in c.get("providers", []):
        provs.append(
            {
                "provider": p.get("provider"),
                "model": p.get("model", ""),
                "enabled": p.get("enabled", True),
                "has_api_key": bool(p.get("api_key")) or p.get("provider") == "ollama",
            }
        )
    c["providers"] = provs
    # chiave della selezione attiva: non esposta, ma indicatore
    c["has_api_key"] = bool((cfg or load()).get("api_key")) or c.get("provider") == "ollama"
    # aggiungi i provider validi noti (per il config UI)
    return c


def ordered_providers(cfg: dict | None = None) -> list[dict]:
    """Ritorna la lista di provider in ordine di priorità (punto 7).

    Se `providers` è vuoto, usa la selezione attiva (provider+model+api_key
    top-level) come singola voce — cosi la config vecchia continua a funzionare.
    """
    c = cfg or load()
    if c.get("providers"):
        return [
            {"provider": p["provider"], "model": p["model"], "api_key": p["api_key"], "enabled": p["enabled"]}
            for p in c["providers"]
        ]
    return [
        {
            "provider": c.get("provider", "ollama"),
            "model": c.get("model", ""),
            "api_key": c.get("api_key", ""),
            "enabled": True,
        }
    ]


def env_for(provider: str) -> dict:
    """Mappa provider → variabile d'ambiente per la key (usata dal resolver)."""
    return {
        "ollama": "PDFMIND_OLLAMA_URL",
        "anthropic": "PDFMIND_ANTHROPIC_API_KEY",
        "openai": "PDFMIND_OPENAI_API_KEY",
        "openrouter": "PDFMIND_OPENROUTER_API_KEY",
        "huggingface": "PDFMIND_HF_API_KEY",
    }.get(provider, "")


def fallback_enabled(cfg: dict | None = None) -> bool:
    c = cfg or load()
    return bool(c.get("fallback_enabled", True))


def resolve_workspace(cfg: dict | None = None) -> str:
    """Risolve la cartella di lavoro del Deep Agent (punto 15/10 + 16/10).

    Priorità:
    1. env `PDFMIND_WORKSPACE` (override esplicito)
    2. campo `workspace` della config Deep Agent (se NON è il default "workspace")
    3. `default_save_folder` della preferenza dell'utente (la cartella di lavoro
       configurata in Avanzate/Impostazioni)

    Se nessuna fonte risolve (env/config/prefs vuoti) NON restiamo su una cartella
    fittizia: ritorniamo stringa vuota, i tool rispondono "workspace non configurata".
    """
    env = os.environ.get("PDFMIND_WORKSPACE", "").strip()
    if env:
        return env
    c = cfg or load()
    ws = str(c.get("workspace", "") or "").strip()
    if ws and ws != "workspace":
        return ws
    # legge la default_save_folder dell'utente dal DB locale
    try:
        from app.core.database import SessionLocal
        from app.repositories.preference_repo import PreferenceRepository
        db = SessionLocal()
        try:
            prefs = PreferenceRepository(db)
            # primo utente con una preferenza salvata (sidecar locale single-user)
            import sqlalchemy
            row = db.query(sqlalchemy.text("1")).first()  # noqa
            from app.models.preference import UserPreference
            first = db.query(UserPreference).order_by(UserPreference.user_id).first()
            folder = (getattr(first, "default_save_folder", None) or "").strip() if first else ""
            if folder:
                return folder
        finally:
            db.close()
    except Exception:  # noqa: BLE001
        pass
    return ""
