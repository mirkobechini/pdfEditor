# Feature: Settings Access from Editor

**Status:** ✅ Completata (2026-08-03)

## Obiettivo

Mettere in funzione l'accesso alle impostazioni dall'editor desktop.

## Dipendenze

- Editor page funzionante
- Pagina settings desktop già esistente (`/settings`)

## Stack

- React + TailwindCSS (desktop frontend)
- Next.js routing

## Output atteso

- Da qualche punto dell'editor (sidebar, menu utente, toolbar) è possibile navigare a `/settings`
- Le impostazioni salvate persistono e hanno effetto (cartella lavoro, sync, ecc.)

## File coinvolti

- `desktop/frontend/src/app/app/page.tsx`
- `desktop/frontend/src/app/settings/page.tsx`

## Status

[x] Completata

**Completata il:** 2026-08-03
**Note:** Gear icon in sidebar + navigazione via `<Link href="/settings">`. Settings page reali con preferenze backend.
