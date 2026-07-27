# Bug: Landing page fixes

**Status:** ✅ Completata (2026-07-27, PR #448)
**Priority:** MEDIA

## Issue

### W5 — Link download desktop

Aggiungere nella landing page un link per scaricare la versione desktop (puntare a GitHub Releases).

### W6 — Rimuovere prezzi

Eliminare `LandingPricing` dalla landing page. Non deve esserci.

## File coinvolti

- `frontend/src/app/landing/page.tsx`
- `frontend/src/app/components/landing/LandingHero.tsx` (aggiungere link download)
- `frontend/src/app/components/landing/LandingFooter.tsx`
- `frontend/messages/en.json` e `it.json`
