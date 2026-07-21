# Plan: Completamento error handling — PR #369

**Status:** ✅ Completata (2026-07-20, PR #369)
**Branch:** feature/369-complete-error-handling

## Obiettivo

Completare la migrazione di tutti gli HTTPException backend e catch block frontend rimanenti al nuovo sistema di error codes standardizzato.

## Todo list (da spuntare via via)

### Backend — Route file da migrare

- [x] `merge_split.py` — 6 HTTPException → `error_response()`
- [x] `reorder.py` — 4 HTTPException → `error_response()`
- [x] `metadata.py` — 2 HTTPException → `error_response()`
- [x] `text.py` — 2 HTTPException → `error_response()`
- [x] `unlock.py` — 1 HTTPException → `error_response()`
- [x] `undo_redo.py` — 2 HTTPException → `error_response()`
- [x] `bug_report.py` — 3 HTTPException → `error_response()`

### Frontend — Catch block da migrare

- [x] `admin/page.tsx` — 3 `alert()` → `mapError()`
- [x] `Sidebar.tsx` — 1 `alert()` + upload fail → `mapError()`
- [x] `PdfViewer.tsx` — già usa `console.error` (nessun raw err.message in UI)
- [x] `app/page.tsx` — già usa `console.error` (nessun raw err.message in UI)

### Test

- [x] Fix assertions in test files for new `{code, detail}` format

### Commits previsti

1. `feat: migrate merge_split, reorder, metadata to error_response`
2. `feat: migrate text, unlock, undo_redo, bug_report to error_response`
3. `feat: migrate frontend admin, sidebar, pdfviewer catch blocks`
4. `test: fix assertions for new error format`
5. `docs: update ADR`

## Note

- I test backend devono essere aggiornati per usare `response.json()["detail"]["detail"]` invece di `response.json()["detail"]`
- I test frontend devono essere aggiornati se cambiano le chiavi i18n attese
