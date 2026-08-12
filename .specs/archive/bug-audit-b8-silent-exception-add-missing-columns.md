# Bug B8: `_add_missing_columns()` silenzia TUTTE le eccezioni

**Status:** [x] Completata (2026-07-14, PR #302)
**Priority:** HIGH
**Complexity:** Low

## Problema

`_add_missing_columns()` usava `except Exception: pass` — silenziava TUTTE le eccezioni.

## Soluzione

Ora cattura solo `OperationalError` (tabella non esiste). Altri `SQLAlchemyError` vengono loggati come warning.
