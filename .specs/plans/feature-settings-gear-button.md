# Feature: Settings gear icon button in editor

**Status:** ✅ Completata (2026-08-03)

## Obiettivo

Aggiungere un pulsante con icona ingranaggio nella schermata principale dell'editor per accedere alle impostazioni.

## Dipendenze

- Editor page funzionante
- Pagina settings desktop esistente

## Stack

- React + TailwindCSS (desktop frontend)

## Output atteso

- Icona ingranaggio (⚙️) posizionata nella toolbar o nella sidebar dell'editor
- Click → naviga a `/settings`
- Il click sul nome utente (già implementato) in futuro andrà alla pagina profilo

## File coinvolti

- `desktop/frontend/src/app/app/page.tsx`

## Status

[x] Completata

**Completata il:** 2026-08-03
**Note:** Icona ingranaggio nella sidebar dell'editor. Il click sul nome utente va a `/profile`.
