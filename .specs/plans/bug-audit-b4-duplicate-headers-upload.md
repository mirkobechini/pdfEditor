# Bug B4: Header duplicati in `uploadPdf()` — può rompere boundary multipart

**Status:** [ ] Non iniziata
**Priority:** CRITICAL
**Complexity:** Low

## Problema

In `frontend/src/app/lib/api.ts`, `uploadPdf()` passa `this.getHeaders()` sia in `headers` dell'options che dentro `_fetch` (che già merge `this.getHeaders()`). Per `FormData`, il browser imposta automaticamente `Content-Type: multipart/form-data; boundary=...`. Forzare headers espliciti può far perdere il boundary parameter, rompendo l'upload.

## Soluzione

Rimuovere `headers: this.getHeaders()` dalla chiamata `_fetch` per `uploadPdf()` — lasciare che `_fetch` gestisca gli headers automaticamente.

## File da modificare

- `frontend/src/app/lib/api.ts`
