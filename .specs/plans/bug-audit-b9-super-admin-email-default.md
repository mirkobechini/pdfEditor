# Bug B9: `SUPER_ADMIN_EMAIL` default pericoloso

**Status:** [ ] Non iniziata
**Priority:** HIGH
**Complexity:** Low

## Problema

In `backend/app/core/config.py`, `SUPER_ADMIN_EMAIL: str = "admin@pdfeditor.local"`. In `main.py::_seed_super_admin`, chiunque si registri con questa email diventa automaticamente admin. Se deployato senza cambiare questa env var, chiunque può registrarsi come `admin@pdfeditor.local` e ottenere privilegi admin.

## Soluzione

Opzione A: Rimuovere il default, forzare configurazione esplicita in `.env`.
Opzione B: Aggiungere check che `SUPER_ADMIN_EMAIL` non sia il default in produzione (se `DEBUG=False`).

## File da modificare

- `backend/app/core/config.py`
- `backend/app/main.py`
