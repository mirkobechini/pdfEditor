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

[ ] Non iniziata
