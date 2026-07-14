# Bug B20: Tipo di ritorno errato in admin.py

**Status:** [ ] Non iniziata
**Priority:** MEDIUM
**Complexity:** Low

## Problema

In `backend/app/api/v1/admin.py`, `list_users` ha annotation `-> list[UserResponse]` ma restituisce `UserListResponse`. FastAPI ignora l'annotation per via di `response_model`, ma strumenti statici lo segnalano come errore.

## Soluzione

Correggere l'annotation a `-> UserListResponse`.

## File da modificare

- `backend/app/api/v1/admin.py`
