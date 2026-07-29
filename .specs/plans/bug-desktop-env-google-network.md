# Bug: Desktop — Google login non configurato + errore di rete + guest fallisce

**Status:** Non iniziata
**Priority:** CRITICAL (Bloccante per uso desktop)

## Problema

1. **Google login non configurato:** Il file `desktop/src-tauri/binaries/.env` non ha `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, mentre `desktop/.env.desktop` sì. Il sidecar PyInstaller copia `.env.desktop` → `.env` a runtime, ma il frontend Next.js è compilato staticamente: `process.env.NEXT_PUBLIC_*` viene inlinato al build time. Serve passarlo come `define` in `next.config.ts`.

2. **Errore di rete:** Conseguenza del punto 1 — senza Google funzionante il login fallisce con errore generico.

3. **Guest access fallisce:** Da verificare — probabilmente stessa causa (backend non raggiungibile o token non gestito correttamente in desktop).

4. **`JWT_SECRET_KEY` vuoto** in `binaries/.env` — security issue, va generato un default.

## Soluzione

1. Unificare `binaries/.env` con `.env.desktop` (incluso `NEXT_PUBLIC_GOOGLE_CLIENT_ID` e `JWT_SECRET_KEY`)
2. Aggiungere `NEXT_PUBLIC_GOOGLE_CLIENT_ID` come `define` in `next.config.ts` per build statica
3. Generare `JWT_SECRET_KEY` di default se vuoto (in `config.py`)
4. Aggiungere logging lato sidecar per debugging connessione

## File coinvolti

- `desktop/src-tauri/binaries/.env`
- `desktop/.env.desktop`
- `frontend/next.config.ts`
- `backend/app/core/config.py`
- `desktop/run_backend.py`
