# Bug: Sidecar PyInstaller non funziona all'avvio dell'app desktop

## Contesto

L'app desktop Tauri (v0.1.13) si installa correttamente ma il backend FastAPI non parte.
L'health check con retry fallisce sempre e l'app resta in "Loading..." all'infinito.
Durante l'installazione il setup mostra un errore relativo a FastAPI (ignorabile).

## Causa probabile

Il sidecar PyInstaller (`fastapi-sidecar.exe`) è buildato nella CI ma non funziona all'esecuzione per uno di questi motivi:

1. **Dipendenze mancanti nel bundle** — PyInstaller non traccia correttamente tutte le dipendenze FastAPI/uvicorn/SQLAlchemy perché `run_backend.py` usa import forzati, ma alcuni moduli potrebbero sfuggire.
2. **Python environment mismatch** — `pip install pyinstaller` in `release.yml` installa PyInstaller nel Python di sistema, ma le deps backend sono installate in un ambiente diverso.
3. **`--paths` non risolve correttamente su Windows CI** — `--paths "$BACKEND_DIR"` su Windows con bash potrebbe non funzionare come previsto.
4. **Mancano hidden-import** per uvicorn, fastapi, sqlalchemy, pydantic, ecc. Oltre a `fitz` servono anche gli altri.

## Fix proposti

1. Aggiungere `--hidden-import` per tutti i modelli usati:
   - uvicorn, fastapi, sqlalchemy, alembic, pydantic, pydantic_settings
   - app.models, app.repositories, app.services, app.api.v1
2. Usare `--collect-all` per `uvicorn` e `fastapi`
3. Verificare che `pip install pyinstaller` usi lo stesso Python delle deps backend
4. Aggiungere debug logging: se il sidecar fallisce, loggare stderr nel Rust

## Priorità

🔴 Alta — Blocca completamente l'uso dell'app desktop

## Status

[x] Risolto
**Data:** 2026-07-28
**Issue:** #470
**PR:** #471
