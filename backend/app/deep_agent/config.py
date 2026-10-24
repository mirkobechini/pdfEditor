"""Deep Agent — config persistita in locale (T3a + punto 7 multi-provider).

La config (provider, modello, workspace, RAG on/off) viene salvata in un file
JSON LOCALE nella cartella dati dell'app. Mai sul cloud.

Le API key NON stanno piu' in questo JSON (decisione 24/10, doc Deep Agents /
LangGraph / Tauri): vivono nel secure store del SO via `keystore` (keyring /
file .env locale). Il file JSON non è mai esposto via API in chiaro e non
contiene MAI il valore delle chiavi: il GET restituisce la config con solo
`has_api_key` (flag calcolato leggendo il keystore). Le config vecchie che
contenevano ancora le chiavi vengono MIGRATE al keystore al primo load.

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
from app.deep_agent import keystore

CONFIG_FILE = "deep_agent_config.json"

DEFAULTS: dict = {
    # Fix 16/10 (esito build 3287e4b): al primo ingresso nessun provider/modello
    # preselezionato — il config UI mostra il placeholder "Seleziona provider" e
    # il campo modello è un <select> disabilitato finché non si sceglie. Il
    # resolver runtime comunque ricade su Ollama (vedi resolve_primary_model).
    "provider": "",                # selezione attiva: ollama | anthropic | openai | openrouter | huggingface
    "model": "",
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
    # Fix 16/10 (esito build 3287e4b): stringa vuota = nessun provider configurato
    # (il config UI mostra il placeholder). Solo un valore invalido NON vuoto cade
    # sul fallback sicuro "ollama". Il runtime ricade comunque su Ollama se non
    # c'è nulla di usable (vedi resolve_primary_model).
    if provider is None:
        return ""
    p = provider.strip()
    if p in VALID_PROVIDERS:
        return p
    return "" if p == "" else "ollama"


def _normalize(cfg: dict) -> dict:
    merged = dict(DEFAULTS)
    merged.update(cfg or {})
    merged["provider"] = _sanitize_provider(merged.get("provider"))
    merged["model"] = str(merged.get("model", "") or "")
    merged["rag_enabled"] = bool(merged.get("rag_enabled", True))
    merged["streaming"] = bool(merged.get("streaming", True))
    merged["fallback_enabled"] = bool(merged.get("fallback_enabled", True))
    # API key: MAI nel JSON (24/10) — viene normalizzata e scritta SOLO nel
    # keystore da save(); il dict in memoria non la trasporta più.
    merged.pop("api_key", None)
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
                "enabled": bool(p.get("enabled", True)),
            }
        )
    merged["providers"] = clean
    return merged


def _migrate_legacy_keys(data: dict) -> dict:
    """Sposta chiavi ancora presenti in un JSON legacy al keystore e le rimuove.

    Le config salvate prima del 24/10 contenevano `api_key` in chiaro (top-level
    e/o per ogni voce di `providers`). Al primo load le spostiamo nel secure
    store e riscriviamo il file senza chiavi: da quel momento il JSON e' pulito.
    Ritorna il dict senza chiavi (migrate o assenti).
    """
    if not isinstance(data, dict):
        return data
    mutated = False
    top = data.get("api_key")
    provider = _sanitize_provider(data.get("provider"))
    if top and provider:
        keystore.set_key(provider, str(top))
        mutated = True
    provs = data.get("providers")
    if isinstance(provs, list):
        for p in provs:
            if isinstance(p, dict) and p.get("api_key") and p.get("provider"):
                keystore.set_key(_sanitize_provider(p["provider"]), str(p["api_key"]))
                mutated = True
    if mutated:
        clean = {k: v for k, v in data.items() if k != "api_key"}
        if isinstance(clean.get("providers"), list):
            clean["providers"] = [
                {k: v for k, v in p.items() if k != "api_key"}
                if isinstance(p, dict)
                else p
                for p in clean["providers"]
            ]
        try:
            p = _config_path()
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(json.dumps(clean, ensure_ascii=False, indent=2), encoding="utf-8")
        except OSError:
            pass
        return clean
    return data


def load() -> dict:
    """Carica la config locale; se mancante usa i default e NON crea il file.

    Se il file contiene ancora chiavi legacy (config pre-24/10) le migra al
    keystore e riscrive il file ripulito.
    """
    p = _config_path()
    if not p.exists():
        return _normalize(DEFAULTS)
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        return _normalize(_migrate_legacy_keys(data or {}))
    except (OSError, ValueError):
        return _normalize(DEFAULTS)


def save(cfg: dict) -> None:
    """Persiste la config (parziale) sul file locale, preservando i default.

    Le chiavi (top-level `api_key` e `providers[].api_key`) NON finiscono nel
    JSON: vengono scritte nel keystore (secure store del SO / .env locale).
    Nel JSON resta solo `has_api_key` calcolato al volo (mai il valore).
    Una stringa vuota in `api_key` cancella la chiave dal keystore.
    """
    current = load()
    for k in DEFAULTS:
        if k in cfg:
            current[k] = cfg[k]
    # chiave attiva presente? va nel keystore, mai nel JSON
    if "api_key" in cfg:
        active_provider = _sanitize_provider(cfg.get("provider") or current.get("provider"))
        keystore.set_key(active_provider, str(cfg.get("api_key") or ""))
    # se è arrivata una lista providers, normalizzala e strada le chiavi al keystore
    if "providers" in cfg:
        current["providers"] = _normalize({"providers": cfg["providers"]})["providers"]
        for entry in cfg.get("providers") or []:
            if not isinstance(entry, dict):
                continue
            prov = _sanitize_provider(entry.get("provider"))
            if "api_key" in entry:
                keystore.set_key(prov, str(entry.get("api_key") or ""))
    current = _normalize(current)
    p = _config_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding="utf-8")


def public(cfg: dict | None = None) -> dict:
    """Rappresentazione per il client: MAI le chiavi, solo flag dal keystore."""
    c = dict(cfg or load())
    c.pop("api_key", None)
    # rimuovi le key dalla lista providers, aggiungi has_api_key per voce (dal keystore)
    provs = []
    for p in c.get("providers", []):
        prov = p.get("provider")
        provs.append(
            {
                "provider": prov,
                "model": p.get("model", ""),
                "enabled": p.get("enabled", True),
                "has_api_key": prov == "ollama" or keystore.has_key(prov),
                # 24/10 (Mirko): forma mascherata per la UI, mai la chiave intera
                "api_key_masked": "" if prov == "ollama" else keystore.mask_key(keystore.get_key(prov)),
            }
        )
    c["providers"] = provs
    # chiave della selezione attiva: non esposta, ma indicatore dal keystore
    c["has_api_key"] = c.get("provider") == "ollama" or keystore.has_key(c.get("provider"))
    c["api_key_masked"] = (
        ""
        if c.get("provider") == "ollama"
        else keystore.mask_key(keystore.get_key(c.get("provider")))
    )
    # aggiungi i provider validi noti (per il config UI)
    return c


def ordered_providers(cfg: dict | None = None) -> list[dict]:
    """Ritorna la lista di provider in ordine di priorità (punto 7).

    Se `providers` è vuoto, usa la selezione attiva (provider+model top-level)
    come singola voce — cosi la config vecchia continua a funzionare.

    Le chiavi NON vengono lette dal JSON: per ogni voce viene letta dal keystore
    (secure store / .env), cosi il resolver runtime ha la key vera e `_provider_usable`
    decide correttamente.
    """
    c = cfg or load()
    if c.get("providers"):
        return [
            {
                "provider": p["provider"],
                "model": p["model"],
                "api_key": keystore.get_key(p["provider"]),
                "enabled": p["enabled"],
            }
            for p in c["providers"]
        ]
    return [
        {
            "provider": c.get("provider", "ollama"),
            "model": c.get("model", ""),
            "api_key": keystore.get_key(c.get("provider")),
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
