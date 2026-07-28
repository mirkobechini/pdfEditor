# Bug: Wrapper layout login (desktop)

## Contesto

La login page desktop ha un contenitore esterno che la fa apparire "incorniciata" invece di full-bleed come nello screenshot Lovable. Causa anche scrollbar verticale indesiderata.

## Causa

La struttura attuale di `desktop/frontend/src/app/login/page.tsx`:

```
div.min-h-screen
  section.border-y
    div.max-w-6xl.px-8.py-20        ← contenitore che crea spaziatura
      div.rounded-2xl.border.shadow-2xl  ← card flottante
        div.grid (split sinistra/destra)
```

- `py-20`, `max-w-6xl`, `rounded-2xl`, `border`, `shadow-2xl` creano l'effetto wrapper
- `min-h-screen` + contenuto eccedente causa scrollbar

## Fix

Rimuovere i wrapper intermedi e far partire la griglia full-bleed:

```
div.h-screen.grid.grid-cols-1.lg:grid-cols-2
  div (sinistra — arancione)
  div (destra — form)
```

- `h-screen` invece di `min-h-screen` (nessuna scroll)
- Nessun `max-w-6xl`, `py-20`, `rounded-2xl`, `border`, `shadow-2xl`
- Nessuna `<section>` intermedia

## Priorità

🔴 Alta — UX bloccante per l'utente

## Status

[x] Risolto
**Data:** 2026-07-28
**Issue:** #460
**PR:** #465
