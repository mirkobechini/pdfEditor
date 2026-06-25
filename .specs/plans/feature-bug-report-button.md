# Feature: Pulsante segnalazione bug

## Obiettivo

Aggiungere il pulsante di segnalazione bug nell'interfaccia, collegato all'API backend `/bug-reports/`.

## Dipendenze

- Backend API bug-report funzionante ✅

## Stack

- React 19 + TailwindCSS v4
- Backend BugReport API

## Output atteso

- Pulsante "Segnala bug" visibile nella toolbar o sidebar
- Modale/dialog con campi: titolo, descrizione (al momento del fix, aggiungere `platform`, `app_version`, `os_info` se si allinea al brief)
- Invio della segnalazione all'API
- Feedback di conferma all'utente

## Status

[x] Completata
**Completata il:** 2026-06-25
**Note:** BugReportDialog creato con campi title/description + validazione. Pulsante arancione nell'header. 9 test vitest. Commit: feat(ui): add BugReportDialog component, feat(ui): add bug report translations, feat(ui): integrate bug report button in header, test(ui): add BugReportDialog tests. PR #56 merged in dev, closes #55.
