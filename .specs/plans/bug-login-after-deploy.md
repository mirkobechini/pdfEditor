# Bug: User cannot login after deploy - password not recognized

**Status:** Open
**Priority:** HIGH
**Complexity:** Medium

## Problema

Dopo il deploy su Render, l'utente esistente non riesce più ad accedere con la propria password.

## Possibili cause

1. **Migration ha alterato la tabella users** — L'aggiunta di colonne (`license_tier_source`, `google_id`, ecc.) potrebbe aver causato un reset dei dati
2. **Database PostgreSQL vs SQLite** — Il DB locale SQLite ha dati diversi dal PostgreSQL su Render
3. **L'utente non esiste su Render** — Il database PostgreSQL su Render è stato creato vuoto, l'utente va registrato di nuovo

## Soluzione

1. Verificare se l'utente esiste nel DB PostgreSQL su Render
2. Se non esiste, registrarsi nuovamente
3. Se esiste ma password non valida, usare reset password (se SMTP funziona) o admin send-reset
