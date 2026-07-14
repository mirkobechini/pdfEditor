# Bug B21: `handleEditText` dead code — mai chiamata

**Status:** [ ] Non iniziata
**Priority:** MEDIUM
**Complexity:** Low

## Problema

In `frontend/src/app/app/page.tsx`, `handleEditText` esiste con un TODO comment e non è mai chiamata da nessun componente.

## Soluzione

Rimuovere la funzione dead code.

## File da modificare

- `frontend/src/app/app/page.tsx`
