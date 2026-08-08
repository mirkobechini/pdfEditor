# Feature: Persistenza dark mode (localStorage)

**Status:** ✅ Completata (2026-07-01)

## Obiettivo

Rendere persistente la preferenza dark mode dell'utente utilizzando localStorage, invece di perdere l'impostazione al refresh della pagina.

## Dipendenze

Nessuna — fix UI autonomo.

## Stack

- React 19
- TailwindCSS v4

## Output atteso

- Preferenza dark mode salvata in localStorage
- Ripristino automatico al caricamento della pagina
- Sincronizzazione tra tab aperte (opzionale, via storage event)

## Status

[x] Completata
**Completata il:** 2026-06-25
**Note:** Dark mode persiste in localStorage con fallback a prefers-color-scheme. Script inline in layout.tsx per prevenire flash. 6 test. Commit: feat(ui): persist dark mode in localStorage with system preference fallback, test(ui): add dark mode persistence tests. PR #60 merged in dev, closes #59.
