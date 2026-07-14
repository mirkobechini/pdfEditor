# Bug B16: `useEffect` in Sidebar missing `loadFiles` in dependency array

**Status:** [ ] Non iniziata
**Priority:** MEDIUM
**Complexity:** Low

## Problema

In `frontend/src/app/components/Sidebar.tsx`, `useEffect` ha `[refreshKey]` come dipendenze ma usa `loadFiles` (definita fuori dall'effect). Se `loadFiles` cattura stato stale via closure, comportamento imprevedibile.

## Soluzione

Spostare `loadFiles` dentro l'effect o aggiungerla alle dipendenze.

## File da modificare

- `frontend/src/app/components/Sidebar.tsx`
