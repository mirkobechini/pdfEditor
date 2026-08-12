# Bug: Reset password email not delivered

**Status:** ✅ Completata (2026-07-13, PR #263)
**Priority:** HIGH
**Complexity:** Medium

## Problema

L'email di reset password non arriva all'utente.

## Possibili cause

1. **SMTP non configurato su Render** — Le variabili d'ambiente SMTP_SERVER, SMTP_USER, SMTP_PASSWORD non sono impostate nel backend su Render
2. **SendGrid API key mancante o errata**
3. **Dominio sender non verificato** — `noreply@pdfeditor.app` non è verificato su SendGrid

## Soluzione

### 1. Verificare env su Render Dashboard

- `SMTP_SERVER=smtp.sendgrid.net`
- `SMTP_PORT=587`
- `SMTP_USER=apikey`
- `SMTP_PASSWORD=<SendGrid API key>`
- `SMTP_FROM_EMAIL=noreply@pdfeditor.app`

### 2. SendGrid

- Verificare che il dominio sender sia autorizzato
- Controllare i log di SendGrid per vedere se l'email è stata inviata

### 3. Backend — Logging

Aggiungere log per vedere se `EmailService.send_password_reset_email()` viene chiamato e se SMTP è configurato.
