# Feature: Dashboard admin

## Obiettivo

Creare una dashboard admin per gestione utenti, licenze e bug report.

## Dipendenze

- Autenticazione UI (per login come admin)
- BugReport model allineato (opzionale)

## Stack

- React 19 + TailwindCSS v4
- Next.js app router
- Backend API admin esistenti ✅

## Output atteso

- Pagina `/admin` accessibile solo a utenti con `license_tier == "admin"` o `is_admin == true`
- Tabella utenti con: email, license_tier, data registrazione, azioni (cambia tier)
- Tabella bug report con: lista segnalazioni, cambio stato (aperto/risolto)
- Gestione licenze: assegnazione lifetime a utenti specifici
- Design responsive, dark mode compatibile

## Status

[x] Completata
**Completata il:** 2026-06-26
**Note:** Pagina `/admin` con tab Users (tabella utenti, cambio license_tier inline) e Bug Reports (tabella segnalazioni, filtro per status, cambio status inline). Admin link viola nell'header (visibile solo a `user.is_admin`). Route guard: redirect a `/` se non admin. 4 API methods aggiunti a `api.ts`. 6 test. Commit: feat(ui): add admin API methods to api.ts, feat(ui): create admin dashboard page with users and bug reports management, feat(ui): add admin link in header for admin users, test(ui): add admin page tests. PR #88 merged in dev, closes #87.
