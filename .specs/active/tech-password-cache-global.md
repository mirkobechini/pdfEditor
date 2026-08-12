# Technical Debt: Password cache module-global non scala (T1)

## Obiettivo

Sostituire la variabile module-global `_password_cache` con una soluzione centralizzata (Redis o DB) per supportare multi-worker.

## Contesto

- **KNOWN_ISSUES.md T1**: `_password_cache` module-global non scala
- File: `backend/app/services/pdf_service.py` (linee 22-47)
- Con multi-worker (gunicorn), ogni worker ha la sua copia della cache
- La cache contiene password per PDF protetti, con TTL di 30 minuti

## Soluzione proposta

1. **Redis** (preferito): usare Redis come cache centralizzata
   - `redis-py` per connessione
   - `EXPIRE` per TTL automatico
   - Fallback a cache locale se Redis non disponibile
2. **DB** (alternativa): tabella `password_cache` in PostgreSQL
   - Più semplice ma meno performante
   - Richiede pulizia periodica delle entry scadute

## Output atteso

- Password cache funzionante con multi-worker
- Nessuna perdita di performance significativa
- Backward compatibility con singolo worker

## Status

[ ] Non iniziata
