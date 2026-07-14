# Bug B6: `SECRET_KEY` vuoto di default — token trivially forgeable

**Status:** [ ] Non iniziata
**Priority:** HIGH
**Complexity:** Low

## Problema

In `backend/app/core/config.py`, `SECRET_KEY` e `JWT_SECRET_KEY` defaultano a `""`. Se nessuna delle due è impostata in `.env`, `effective_secret_key` restituisce stringa vuota, e PyJWT firma token con chiave vuota — token trivially forgeable.

## Soluzione

Aggiungere validazione in `Settings` che lanci errore se `effective_secret_key` è vuota. Usare `@field_validator('JWT_SECRET_KEY', mode='after')` per crashare a startup se non configurato.

## File da modificare

- `backend/app/core/config.py`
