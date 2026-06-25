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

[ ] Non iniziata
