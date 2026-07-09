# Feature: Invio email reale per reset password

## Obiettivo

Inviare realmente via SMTP il link di reset password, eliminando la dipendenza dal log server in produzione.

## Dipendenze

- Endpoint forgot/reset password gia implementati
- Configurazione SMTP in backend
- FRONTEND_URL valorizzato correttamente negli ambienti deploy

## Stack

- FastAPI
- SMTP (provider esterno o relay)
- Pydantic Settings
- Next.js (solo per UX messaggi)

## Output atteso

- `POST /auth/forgot-password` invia email reale con link reset
- Link reset usa `FRONTEND_URL/reset-password?token=...`
- Nessuna enumerazione email: response sempre 202 e messaggio neutro
- Logging senza esporre token in produzione
- Test backend coprono invio email success/failure e token lifecycle

## Status

[~] In progress — Paused
**Avviata il:** 2026-07-01
**Note:** SendGrid SMTP integrato, `email_service.py` implementato con `send_password_reset_email()`, endpoint forgot-password invia email con link reset. **In pausa:** Sender identity verification su SendGrid posticipata a quando dominio custom sarà disponibile. Il token viene ancora stampato in console in development come fallback.

## Implementazione proposta (step by step)

1. Aggiungere un servizio email dedicato nel backend con interfaccia unica (send_reset_email).
2. Integrare il servizio in `request_password_reset`/route forgot-password, mantenendo risposta 202 costante.
3. Introdurre gestione errori SMTP non bloccante lato sicurezza (stesso messaggio verso client).
4. Spegnere stampa token su console in produzione e mantenere log sanitizzato.
5. Aggiornare variabili ambiente (`SMTP_*`, `FRONTEND_URL`) su Render.
6. Aggiungere test unit/integration per invio email e casi SMTP down.
7. Aggiornare copy frontend forgot-password per riflettere invio email reale.
