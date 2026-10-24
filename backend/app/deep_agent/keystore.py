"""Deep Agent — API key nel secure store del SO (mai nel config JSON).

Decisione 24/10 (Mirko + 3 doc ufficiali consultate: Deep Agents, LangGraph,
Tauri): le chiavi NON stanno piu' in `deep_agent_config.json` — le key si
configurano nell'ambiente / secure store del sistema, mai in un file di
config applicativo.

Ordine di persistenza/lettura:
1. **keyring** (Windows Credential Locker / macOS Keychain / SecretService):
   back-end nativo del SO, il modo documentato per i segreti desktop.
2. **file `.env` locale** nella app data dir (pattern LangChain/LangGraph):
   fallback quando il SO non espone un keyring (es. WSL/CI senza SecretService).
   Il file ha permessi ristretti e NON E' il config JSON.

Il `deep_agent_config.json` non contiene MAI il valore della chiave: espone
solo `has_api_key` (calcolato al volo leggendo il keystore).
"""

from __future__ import annotations

import os
from pathlib import Path

SERVICE = "PdfEditor"
KEYS_FILE = "deep_agent_keys.env"

# Nomi variabile d'ambiente per retro-compat (env var resta una fonte valida
# per la doc LangChain; la usiamo come ultimo fallback in lettura).
_ENV_NAMES = {
    "ollama": "PDFMIND_OLLAMA_URL",
    "anthropic": "PDFMIND_ANTHROPIC_API_KEY",
    "openai": "PDFMIND_OPENAI_API_KEY",
    "openrouter": "PDFMIND_OPENROUTER_API_KEY",
    "huggingface": "PDFMIND_HF_API_KEY",
}


def _keys_path() -> Path:
    """Percorso del file .env locale delle chiavi, accanto al config JSON.

    Import lazy di `_config_path` per evitare il ciclo d'import config↔keystore
    e per rispettare le monkeypatch dei test su quel simbolo.
    """
    from app.deep_agent.config import _config_path  # lazy: evita ciclo + rispetta monkeypatch

    return _config_path().parent / KEYS_FILE


def _load_env_file() -> dict[str, str]:
    """Legge il file .env locale delle chiavi (formato chiave=valore)."""
    p = _keys_path()
    if not p.exists():
        return {}
    try:
        out: dict[str, str] = {}
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip()
        return out
    except OSError:
        return {}


def _write_env_file(pairs: dict[str, str]) -> None:
    """Scrive il file .env locale con permessi ristretti (0600)."""
    p = _keys_path()
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(
            "".join(f"{k}={v}\n" for k, v in sorted(pairs.items()) if v),
            encoding="utf-8",
        )
        try:
            os.chmod(p, 0o600)
        except OSError:
            pass
    except OSError:
        pass


def _keyring_available() -> bool:
    """True se il SO espone un keyring funzionante (test reale, no import finti)."""
    try:
        import keyring

        kr = keyring.get_keyring()
        if kr is None or "fail" in type(kr).__name__.lower():
            return False
        # test reale di scrittura/lettura su una riga usa-e-getta
        keyring.set_password(SERVICE, "__pdfeditor_probe__", "1")
        ok = keyring.get_password(SERVICE, "__pdfeditor_probe__") == "1"
        keyring.delete_password(SERVICE, "__pdfeditor_probe__")
        return ok
    except Exception:  # noqa: BLE001 — NoKeyringError / backend mancante (WSL, CI)
        return False


def set_key(provider: str, api_key: str) -> None:
    """Salva la chiave per il provider nel secure store (o .env locale).

    Una stringa vuota equivale a `delete_key(provider)`.
    """
    provider = (provider or "").strip()
    if not provider:
        return
    api_key = api_key or ""
    if not api_key:
        delete_key(provider)
        return
    if _keyring_available():
        try:
            import keyring

            keyring.set_password(SERVICE, provider, api_key)
            # se prima era nel file .env, rimuovila per non lasciare doppioni
            pairs = _load_env_file()
            if _ENV_NAMES.get(provider) in pairs:
                del pairs[_ENV_NAMES.get(provider)]  # type: ignore[index]
                _write_env_file(pairs)
            return
        except Exception:  # noqa: BLE001
            pass  # keyring fallito a runtime -> fallback file
    pairs = _load_env_file()
    pairs[_ENV_NAMES.get(provider, provider)] = api_key
    _write_env_file(pairs)


def get_key(provider: str | None) -> str:
    """Ritorna la chiave del provider: keyring -> .env locale -> env var."""
    provider = (provider or "").strip()
    if not provider:
        return ""
    if _keyring_available():
        try:
            import keyring

            v = keyring.get_password(SERVICE, provider)
            if v:
                return v
        except Exception:  # noqa: BLE001
            pass
    env_name = _ENV_NAMES.get(provider)
    v = _load_env_file().get(env_name or provider, "")
    if v:
        return v
    if env_name:
        return os.environ.get(env_name, "")
    return ""


def delete_key(provider: str | None) -> None:
    """Rimuove la chiave del provider dal secure store e dal file .env."""
    provider = (provider or "").strip()
    if not provider:
        return
    try:
        import keyring

        if _keyring_available():
            try:
                keyring.delete_password(SERVICE, provider)
            except Exception:  # noqa: BLE001 — chiave assente: ok
                pass
    except Exception:  # noqa: BLE001
        pass
    pairs = _load_env_file()
    env_name = _ENV_NAMES.get(provider, provider)
    if env_name in pairs:
        del pairs[env_name]
        _write_env_file(pairs)


def has_key(provider: str | None) -> bool:
    """True se esiste una chiave per il provider (in una qualunque fonte)."""
    return bool(get_key(provider))


def mask_key(api_key: str | None) -> str:
    """Forma MASCHERATA della chiave per la UI — mai la chiave intera.

    Mostra solo i primi e gli ultimi caratteri (richiesta Mirko 24/10, come
    nelle altre app): es. "sk-…abcd". Le chiavi molto corte vengono mostrate
    comunque solo per 2+2 caratteri. Stringa vuota se non c'è chiave.
    """
    k = (api_key or "").strip()
    if not k:
        return ""
    if len(k) <= 8:
        return f"{k[:2]}…{k[-2:]}"
    return f"{k[:4]}…{k[-4:]}"
