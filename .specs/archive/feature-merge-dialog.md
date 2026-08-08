# Feature: Merge PDF Dialog

**Status:** Non iniziata

## Obiettivo

Implementare il dialog di merge PDF nell'editor desktop. Permette di unire più PDF in uno solo.

## Dipendenze

- Editor page funzionante con upload PDF
- Backend endpoint `POST /pdfs/merge` già esistente

## Stack

- React + TailwindCSS (desktop frontend)
- Backend FastAPI endpoint già implementato

## Output atteso

- Click pulsante "Merge" nella toolbar → apre dialog modale
- Selezione di più PDF dalla lista documenti
- Opzione ordinamento drag-and-drop
- Pulsante "Merge" → chiamata API → nuovo PDF nella lista

## File coinvolti

- `desktop/frontend/src/app/app/page.tsx`
- `desktop/frontend/src/components/MergeDialog.tsx` (da creare)

## Status

[ ] Non iniziata