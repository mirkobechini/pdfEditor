# Bug B1: Duplicate `raise HTTPException` in auth.py

**Status:** [x] Completata (2026-07-14, PR #288)
**Priority:** CRITICAL
**Complexity:** Low

## Problema

Alla riga 129-134 di `backend/app/api/v1/auth.py`, il secondo blocco `raise HTTPException` è dead code — non viene mai raggiunto perché il primo `raise` esce già dalla funzione.

## Soluzione

Rimosso il secondo blocco `raise HTTPException` duplicato.

## File modificati

- `backend/app/api/v1/auth.py` — rimosse righe duplicate
