# Plan: Completamento error handling — PR #369

**Status:** In progress
**Branch:** feature/369-complete-error-handling

## Obiettivo

Completare la migrazione di tutti gli HTTPException backend e catch block frontend rimanenti al nuovo sistema di error codes standardizzato.

## Todo list (da spuntare via via)

### Backend — Route file da migrare

- [ ] `merge_split.py` — 6 HTTPException → `error_response()`
- [ ] `reorder.py` — 4 HTTPException → `error_response()`
- [ ] `metadata.py` — 2 HTTPException → `error_response()`
- [ ] `text.py` — 2 HTTPException → `error_response()`
- [ ] `unlock.py` — 1 HTTPException → `error_response()`
- [ ] `undo_redo.py` — 2 HTTPException → `error_response()`
- [ ] `bug_report.py` — 3 HTTPException → `error_response()`

### Frontend — Catch block da migrare

- [ ] `admin/page.tsx` — 3 `alert()` → `setError()` + UI feedback
- [ ] `Sidebar.tsx` — 1 `alert()` + upload fail → `mapError()`
- [ ] `PdfViewer.tsx` — 1 `alert()` → `mapError()`
- [ ] `app/page.tsx` — 8 `console.error()` → `mapError()` (silent, DEMOTE)

### Test

- [ ] Fix assertions in test files for new `{code, detail}` format

### Commits previsti

1. `feat: migrate merge_split, reorder, metadata to error_response`
2. `feat: migrate text, unlock, undo_redo, bug_report to error_response`
3. `feat: migrate frontend admin, sidebar, pdfviewer catch blocks`
4. `test: fix assertions for new error format`
5. `docs: update ADR`

## Note

- I test backend devono essere aggiornati per usare `response.json()["detail"]["detail"]` invece di `response.json()["detail"]`
- I test frontend devono essere aggiornati se cambiano le chiavi i18n attese
