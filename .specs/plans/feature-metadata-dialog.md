# Feature: Metadata Dialog UI for PDF Metadata

**Issue Number**: issue-148

## Obiettivo

Aggiungere UI frontend per visualizzare e modificare i metadati dei PDF (titolo, autore, soggetto, keywords). Backend e API client sono già pronti, manca solo il dialog.

## Problema

- `GET /pdfs/{id}/metadata` e `PUT /pdfs/{id}/metadata` funzionanti
- `api.getMetadata(id)` e `api.updateMetadata(id, metadata)` già in `api.ts`
- ❌ Nessun pulsante nella toolbar per aprire i metadati
- ❌ Nessun `MetadataDialog.tsx` componente
- ❌ Nessuna chiave i18n per metadata

## Dipendenze

- `frontend/src/app/components/MetadataDialog.tsx` (nuovo)
- `frontend/src/app/components/Toolbar.tsx` (aggiungere pulsante)
- `frontend/src/app/page.tsx` (gestire stato + handler)
- `frontend/messages/en.json` e `it.json` (chiavi traduzione)

## Stack

- Frontend: React 19 + TypeScript
- Backend: già pronto

## Output atteso

✅ Nuovo componente `MetadataDialog` con:

1. Pulsante "Info" / "Metadata" nella toolbar
2. Dialog modale con campi: Title, Author, Subject, Keywords
3. Load dei metadati all'apertura via `api.getMetadata()`
4. Save via `api.updateMetadata()`
5. Messaggi di errore/successo
6. Traduzioni IT/EN

## Accettazione Criteria

- [ ] MetadataDialog.tsx creato con form (title, author, subject, keywords)
- [ ] Toolbar.tsx ha pulsante metadata che apre il dialog
- [ ] page.tsx ha handler `handleOpenMetadata` / `handleSaveMetadata`
- [ ] I18n keys aggiunte per metadata dialog
- [ ] Test: dialog si apre, carica metadati, salva
- [ ] Full suite test passa

## Status

- [ ] Non iniziata
- [ ] In progress
- [ ] In review
- [x] ✅ Completata (merged to dev - PR #144)

## Timeline

Stimato: 45 minuti
