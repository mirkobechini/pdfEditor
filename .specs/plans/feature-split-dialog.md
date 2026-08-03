# Feature: Split PDF Dialog

**Status:** Non iniziata

## Obiettivo

Implementare il dialog di split PDF nell'editor desktop. Permette di dividere un PDF in più file.

## Dipendenze

- Editor page funzionante con upload PDF
- Backend endpoint `POST /pdfs/split` già esistente

## Stack

- React + TailwindCSS (desktop frontend)
- Backend FastAPI endpoint già implementato

## Output atteso

- Click pulsante "Split" nella toolbar → apre dialog modale
- Selezione pagine da estrarre (range o singole)
- Pulsante "Split" → chiamata API → nuovi PDF nella lista

## File coinvolti

- `desktop/frontend/src/app/app/page.tsx`
- `desktop/frontend/src/components/SplitDialog.tsx` (da creare)

## Status

[ ] Non iniziata