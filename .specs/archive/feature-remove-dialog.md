# Feature: Remove Pages Dialog

**Status:** Non iniziata

## Obiettivo

Implementare il dialog di rimozione pagine PDF nell'editor desktop.

## Dipendenze

- Editor page funzionante con upload PDF
- Backend endpoint `POST /pdfs/remove` già esistente

## Stack

- React + TailwindCSS (desktop frontend)
- Backend FastAPI endpoint già implementato

## Output atteso

- Click pulsante "Remove" nella toolbar → apre dialog modale
- Selezione pagine da rimuovere
- Pulsante "Remove" → chiamata API → PDF senza quelle pagine

## File coinvolti

- `desktop/frontend/src/app/app/page.tsx`
- `desktop/frontend/src/components/RemoveDialog.tsx` (da creare)

## Status

[ ] Non iniziata