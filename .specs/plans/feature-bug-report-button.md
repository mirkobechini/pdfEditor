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

[ ] Non iniziata
