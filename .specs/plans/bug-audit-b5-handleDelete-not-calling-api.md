# Bug B5: `handleDelete` non chiama `api.deletePdf` — desync UI/DB

**Status:** [x] Completata (2026-07-14, PR #296)
**Priority:** CRITICAL
**Complexity:** Medium

## Problema

In `page.tsx`, `handleDelete()` aggiornava solo la UI ma non chiamava `api.deletePdf`. La chiamata era in `DeleteModal.tsx`, dividendo la responsabilità.

## Soluzione

Spostata `api.deletePdf` in `handleDelete()` in `page.tsx`. `DeleteModal` ora chiama solo `onConfirm()` — se lancia eccezione, `DeleteModal` la cattura e mostra alert.
