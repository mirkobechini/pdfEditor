# Bug B1: Duplicate `raise HTTPException` in auth.py

**Status:** [ ] Non iniziata
**Priority:** CRITICAL
**Complexity:** Low

## Problema

Alla riga 129-134 di `backend/app/api/v1/auth.py`, il secondo blocco `raise HTTPException` è dead code — non viene mai raggiunto perché il primo `raise` esce già dalla funzione.

## Soluzione

Rimuovere il secondo blocco `raise HTTPException` duplicato.

## File da modificare

- `backend/app/api/v1/auth.py` — rimuovere righe 130-134
- `backend/app/api/v1/auth.py` — verificare che il `try/except` sia corretto
