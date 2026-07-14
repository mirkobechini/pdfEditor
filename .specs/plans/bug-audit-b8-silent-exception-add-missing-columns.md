# Bug B8: `_add_missing_columns()` silenzia TUTTE le eccezioni

**Status:** [ ] Non iniziata
**Priority:** HIGH
**Complexity:** Low

## Problema

In `backend/app/main.py`, `_add_missing_columns()` ha `except Exception: pass`. Questo silenzia qualsiasi errore — non solo "table doesn't exist" ma anche errori di connessione DB, permessi, SQL syntax. Un errore critico di database viene mascherato all'avvio.

## Soluzione

Catturare solo l'eccezione specifica per "table doesn't exist" (es. `sqlalchemy.exc.OperationalError` con check del messaggio), e loggare (non silenziare) le altre eccezioni.

## File da modificare

- `backend/app/main.py`
