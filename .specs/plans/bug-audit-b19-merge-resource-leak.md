# Bug B19: Resource leak in `merge()` su eccezione

**Status:** [ ] Non iniziata
**Priority:** MEDIUM
**Complexity:** Low

## Problema

In `backend/app/services/pdf_merge_split_service.py`, se `_get_user_pdf` lancia ValueError dopo che alcuni doc sono già aperti in `source_docs`, questi doc vengono leaked (mai chiusi).

## Soluzione

Usare try/finally per chiudere `source_docs` in caso di eccezione.

## File da modificare

- `backend/app/services/pdf_merge_split_service.py`
