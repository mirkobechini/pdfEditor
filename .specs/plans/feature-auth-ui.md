# Feature: Autenticazione UI (Login/Register)

## Obiettivo

Aggiungere i componenti React per login, registrazione e gestione sessione utente. I metodi API in `api.ts` esistono già — mancano le pagine e i flussi UI.

## Dipendenze

- Backend API auth funzionante ✅

## Stack

- React 19 + TailwindCSS v4
- Next.js app router
- JWT (gestione token in memoria/localStorage)

## Output atteso

- Pagina `/login` con form email + password
- Pagina `/register` con form email + password + conferma
- Reindirizzamento dopo login/register alla dashboard
- Logout dalla sidebar/header
- Protezione route base (reindirizzamento a /login se non autenticati)
- Feedback visivo (errori, loading, successo)

## Status

[x] Completata
**Completata il:** 2026-06-25
**Note:** AuthProvider con JWT localStorage persist, pagine /login e /register con validazione, route protection su home, logout in header, traduzioni EN/IT. 19 test. Commit: feat(ui): add AuthContext provider, feat(ui): add login page, feat(ui): add register page, feat(ui): add auth translations, feat(ui): integrate auth in layout and route protection, test(ui): add auth tests. PR #58 merged in dev, closes #57.
