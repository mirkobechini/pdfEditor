# Bug B17: Google OAuth certs lookup — dead code `if` block

**Status:** [ ] Non iniziata
**Priority:** MEDIUM
**Complexity:** Low

## Problema

In `backend/app/services/auth_service.py`, il controllo `if kid not in certs.get("keys", {})` non funziona perché `keys` è una lista, non un dict. Il `in` check su una lista non trova mai il `kid`. Il codice cade sempre nel loop manuale che funziona, ma il primo `if` è dead code fuorviante.

## Soluzione

Rimuovere il `if dead code` e mantenere solo il loop manuale di ricerca.

## File da modificare

- `backend/app/services/auth_service.py`
