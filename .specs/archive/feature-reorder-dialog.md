# Feature: Reorder PDF Dialog

**Status:** Non iniziata

## Obiettivo

Implementare il dialog di riordino pagine PDF nell'editor desktop.

## Dipendenze

- Editor page funzionante con upload PDF
- Backend endpoint `POST /pdfs/reorder` già esistente

## Stack

- React + TailwindCSS (desktop frontend)
- Backend FastAPI endpoint già implementato

## Output atteso

- Click pulsante "Reorder" nella toolbar → apre dialog modale
- Lista pagine con drag-and-drop per riordinare
- Pulsante "Reorder" → chiamata API → PDF riordinato

## File coinvolti

- `desktop/frontend/src/app/app/page.tsx`
- `desktop/frontend/src/components/ReorderDialog.tsx` (da creare)

## Status

[ ] Non iniziata