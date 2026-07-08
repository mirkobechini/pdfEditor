# Feature: Replace Text Dialog for PDF Find & Replace

**Issue Number**: issue-149

## Obiettivo

Aggiungere UI frontend per la sostituzione testo nei PDF (find & replace). Backend e API client sono già pronti. La toolbar ha già la prop `onReplaceText` ma vuota e senza pulsante.

## Problema

- `POST /pdfs/{id}/replace-text` e `GET /pdfs/{id}/text` funzionanti
- `api.replaceText(id, search, replace)` già in `api.ts`
- `Toolbar.tsx` ha prop `onReplaceText` ma non renderizza pulsante
- `page.tsx` passa `onReplaceText={() => {}}` — funzione vuota
- ❌ Nessun pulsante visibile
- ❌ Nessun `ReplaceTextDialog.tsx`

## Dipendenze

- `frontend/src/app/components/ReplaceTextDialog.tsx` (nuovo)
- `frontend/src/app/components/Toolbar.tsx` (aggiungere pulsante e icona)
- `frontend/src/app/page.tsx` (handler reale, non vuoto)
- `frontend/messages/en.json` e `it.json` (chiavi traduzione)

## Stack

- Frontend: React 19 + TypeScript
- Backend: già pronto

## Output atteso

✅ Nuovo componente `ReplaceTextDialog` con:

1. Pulsante "Replace Text" nella toolbar (solo quando PDF selezionato)
2. Dialog con campo "Search" e "Replace with"
3. Opzione per sostituzione singola o tutte le occorrenze
4. API call a `replaceText()` con feedback
5. Traduzioni IT/EN

## Accettazione Criteria

- [ ] ReplaceTextDialog.tsx creato
- [ ] Toolbar.tsx ha pulsante "Replace Text"
- [ ] page.tsx ha handler `handleReplaceText`
- [ ] I18n keys per replace text
- [ ] Test: dialog funziona
- [ ] Full suite test passa

## Status

- [ ] Non iniziata
- [ ] In progress
- [ ] In review
- [ ] Completata

## Timeline

Stimato: 45 minuti
