# Bug B4: Header duplicati in `uploadPdf()` — può rompere boundary multipart

**Status:** [x] Completata (2026-07-14, PR #294)
**Priority:** CRITICAL
**Complexity:** Low

## Problema

In `frontend/src/app/lib/api.ts`, `uploadPdf()` passava `headers: this.getHeaders()` a `_fetch()`, ma `_fetch()` già merge `this.getHeaders()` internamente. Per `FormData`, headers espliciti possono far perdere il boundary multipart.

## Soluzione

Rimossa la riga `headers: this.getHeaders()` — `_fetch` lo gestisce già.

## File modificati

- `frontend/src/app/lib/api.ts`
