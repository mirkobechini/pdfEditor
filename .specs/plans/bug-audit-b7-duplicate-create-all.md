# Bug B7: `_run_migrations()` chiamato 2 volte all'avvio

**Status:** [ ] Non iniziata
**Priority:** HIGH
**Complexity:** Low

## Problema

In `backend/app/main.py`, `lifespan` chiama `_run_migrations()` (che già fa `Base.metadata.create_all()`), e subito dopo chiama `Base.metadata.create_all()` di nuovo. Ridondante e spreca ~100ms.

## Soluzione

Rimuovere la seconda chiamata `Base.metadata.create_all(bind=engine)` dalla `lifespan` function.

## File da modificare

- `backend/app/main.py`
