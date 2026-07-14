# Bug B18: `_password_cache` globale non pulita su shutdown

**Status:** [ ] Non iniziata
**Priority:** MEDIUM
**Complexity:** Low

## Problema

In `backend/app/services/pdf_service.py`, `_password_cache` è un dict globale che contiene password in chiaro in memoria. Non c'è cleanup su shutdown.

## Soluzione

Aggiungere funzione `_clear_password_cache()` e chiamarla in `_cleanup_on_shutdown()` in `main.py`.

## File da modificare

- `backend/app/services/pdf_service.py`
- `backend/app/main.py`
