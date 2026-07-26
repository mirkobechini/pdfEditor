# Bug: Guest access visibile anche su webapp

**Status:** Non iniziata
**Priority:** ALTA (UX)

## Problema

Il pulsante "Continue as Guest" è visibile anche nella webapp. Deve essere solo su desktop.

## Soluzione

Aggiungere controllo `isTauri()` nel login page per mostrare il pulsante guest solo in ambiente desktop.

## File coinvolti

- `frontend/src/app/login/page.tsx`
