# Bug B16: `useEffect` in Sidebar missing `loadFiles` in dependency array

**Status:** [x] Completata (2026-07-15, PR #318)
**Priority:** MEDIUM
**Complexity:** Low

## Problema

`loadFiles` era definita fuori dall'effect ma non nelle dipendenze — possibile closure stale.

## Soluzione

Spostata `loadFiles` dentro l'`useEffect`.
