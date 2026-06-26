# Feature: API upload protette da autenticazione

## Obiettivo

Decidere e implementare la protezione degli endpoint PDF (upload, merge, split, reorder, text, metadata, convert) con autenticazione JWT.

## Dipendenze

- Auth UI (opzionale — gli endpoint possono essere protetti anche senza UI)

## Stack

- FastAPI (dependencies JWT)
- SQLAlchemy 2.0

## Output atteso

- Endpoint PDF protetti con `Depends(get_current_user)` dove appropriato
- Decisione documentata su quali endpoint restano pubblici (es. solo upload/download base per utenti non registrati?)
- Test di autenticazione per endpoint protetti

## Status

[x] Completata
**Completata il:** 2026-06-26
**Note:** Aggiunta colonna `user_id` a `PdfDocument`. Tutti gli endpoint `/pdfs/*` protetti con `Depends(get_current_user)`. Ogni utente vede/modifica/elimina solo i propri PDF. Migration `450f3b0491f0`. 107 test backend passanti. (PR #91, issue #89)
