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

[ ] Non iniziata
