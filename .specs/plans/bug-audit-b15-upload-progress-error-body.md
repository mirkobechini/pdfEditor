# Bug B15: `uploadPdfWithProgress` ignora JSON error body

**Status:** [x] Completata (2026-07-15, PR #316)
**Priority:** MEDIUM
**Complexity:** Low

## Problema

`uploadPdfWithProgress` usava `xhr.statusText` per gli errori, perdendo il JSON body `{"detail": "..."}`.

## Soluzione

Ora tenta di parsare il JSON body per estrarre `detail`, come `ApiClient.extractError`.
