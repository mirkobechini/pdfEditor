# Bug: Guest access visibile anche su webapp

**Status:** ✅ Completata (2026-07-27, PR #447)
**Priority:** ALTA (UX)

## Problema

Il pulsante "Continue as Guest" è visibile anche nella webapp. Deve essere solo su desktop.

## Soluzione

Aggiungere controllo `isTauri()` nel login page per mostrare il pulsante guest solo in ambiente desktop.

## File coinvolti

- `frontend/src/app/login/page.tsx`
