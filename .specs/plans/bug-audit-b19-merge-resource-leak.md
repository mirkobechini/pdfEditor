# Bug B19: Resource leak in `merge()` su eccezione

**Status:** [x] Completata (2026-07-15, PR #324)
**Priority:** MEDIUM
**Complexity:** Low

## Problema

In `merge()`, se `_get_user_pdf` o `_get_file_content` lanciavano eccezione, i documenti fitz in `source_docs` non venivano chiusi.

## Soluzione

Wrappato il loop e la creazione dell'output in try/finally per garantire chiusura.
