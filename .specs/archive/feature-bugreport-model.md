# Feature: Allineamento modello BugReport al brief

**Status:** ✅ Completata (2026-07-01)

## Obiettivo

Aggiornare il modello BugReport e il relativo service per corrispondere esattamente al brief: aggiungere campi `platform`, `app_version`, `os_info` e sistema di deduplica.

## Dipendenze

- Feature bug-report button (opzionale — può essere fatto prima)

## Stack

- SQLAlchemy 2.0
- FastAPI
- Pydantic v2

## Output atteso

- Modello BugReport con campi: `platform`, `app_version`, `os_info` (oltre a `title`, `description`, `page_url`, `status`)
- API aggiornata per accettare i nuovi campi
- BugReportService refattorizzato per usare repository pattern (non query dirette)
- Test aggiornati

## Status

[x] Completata
**Completata il:** 2026-06-25
**Note:** Aggiunti campi platform, app_version, os_info al modello BugReport. Creato BugReportRepository. Refactoring BugReportService con repository pattern. Migration 5eec22a141a3. 93/94 test backend passanti. PR #64 merged in dev, closes #63.
