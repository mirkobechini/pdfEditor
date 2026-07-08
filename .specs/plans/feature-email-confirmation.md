# Feature: Conferma email account

## Obiettivo

Introdurre un flusso di verifica email (double opt-in) per attivare l'account dopo registrazione.

## Dipendenze

- Invio email reale via SMTP
- Gestione token temporanei in database
- UI auth (register/login) gia presente

## Stack

- FastAPI
- SQLAlchemy 2.0
- SMTP
- Next.js 16 + next-intl

## Output atteso

- Alla registrazione viene creato token di conferma email con scadenza
- Viene inviata email con link di verifica
- Nuovo endpoint backend per conferma token
- Login bloccato finche email non confermata (con messaggio chiaro)
- UI frontend per esito conferma (success/expired/invalid + reinvio)
- Test backend/frontend per tutti i casi principali

## Status

[ ] Non iniziata

## Implementazione proposta (step by step)

1. Estendere modello `User` con `is_email_verified`, `email_verification_token`, `email_verification_expires`.
2. Creare migration Alembic per i nuovi campi.
3. Implementare endpoint backend: invio verifica, conferma token, reinvio token.
4. Aggiornare login per bloccare accesso se email non verificata.
5. Creare pagina frontend di conferma email con gestione stati token.
6. Aggiungere azione frontend per reinvio email di verifica.
7. Coprire con test backend (token valid/invalid/expired) e frontend (UX flow).
8. Aggiornare documentazione env SMTP e URL frontend.
