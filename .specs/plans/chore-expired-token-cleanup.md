# Chore: Add Expired Token Cleanup

**Issue Number**: issue-141

## Obiettivo

Aggiungere meccanismo di cleanup per i reset token scaduti nel DB. Attualmente i token scaduti rimangono in DB a vita, occupando spazio.

## Problema

- `request_password_reset()` imposta `reset_token` e `reset_token_expires`
- `reset_password()` pulisce solo **se l'utente completa il reset** (reset_token → None)
- Se l'utente **non completa mai** il reset, il token scaduto resta in DB per sempre
- Nessun cleanup automatico (no cron job, no scheduler, no lazy purge)

**Rischio:** Basso (il token è sempre validato all'uso), ma è technical debt.

## Dipendenze

- `backend/app/repositories/user_repo.py` — Nuovo metodo `delete_expired_tokens()`
- `backend/app/services/auth_service.py` — Nuovo metodo `cleanup_expired_tokens()`

## Stack

- Backend: FastAPI + SQLAlchemy

## Approcci Possibili

### Scelto: Lazy cleanup on password reset request

Ogni volta che un utente richiede un password reset, prima di generare il nuovo token, pulisce tutti i token scaduti. Leggero, non richiede cron job, e scala automaticamente con l'uso.

### Alternativa (scartata): Periodic job via BackgroundTasks

Richiederebbe un worker esterno o logica di scheduling. Overengineerato per ora.

## Output atteso

✅ Dopo implementazione:

1. `UserRepository.delete_expired_tokens()` — DELETE query per reset_token_expires < now
2. `AuthService.request_password_reset()` chiama cleanup prima di generare nuovo token
3. Token scaduti non occupano più spazio in DB

## Accettazione Criteria

- [ ] `user_repo.py` aggiunge `delete_expired_tokens()` method
- [ ] `auth_service.py` chiama cleanup in `request_password_reset()`
- [ ] Test: chiamata richiesta reset → token scaduti vengono eliminati
- [ ] Backward compatible: non modifica flusso esistente

## Status

- [ ] Non iniziata
- [ ] In progress
- [ ] In review
- [x] ✅ Completata (merged to dev - PR #139)

## Timeline

Stimato: 20 minuti

## Note

- Usare `datetime.utcnow()` per confronto SQLite
- `reset_token_expires` è nullable (utenti senza reset in corso)
- Lazy cleanup è sufficiente: scala con l'uso dell'app
