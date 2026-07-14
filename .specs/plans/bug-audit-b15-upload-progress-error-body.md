# Bug B15: `uploadPdfWithProgress` ignora JSON error body

**Status:** [ ] Non iniziata
**Priority:** MEDIUM
**Complexity:** Low

## Problema

In `frontend/src/app/lib/api.ts`, `uploadPdfWithProgress` usa `xhr.statusText` per gli errori invece di parsare il JSON body `{"detail": "..."}`. L'utente vede "Internal Server Error" invece del messaggio specifico.

## Soluzione

Parsare `xhr.responseText` come JSON e usare `detail` field, come fa `ApiClient.extractError`.

## File da modificare

- `frontend/src/app/lib/api.ts`
