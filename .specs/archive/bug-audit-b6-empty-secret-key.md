# Bug B6: `SECRET_KEY` vuoto di default — token trivially forgeable

**Status:** [x] Completata (2026-07-14, PR #298)
**Priority:** HIGH
**Complexity:** Low

## Problema

SECRET_KEY e JWT_SECRET_KEY defaultavano a "". effective_secret_key restituiva stringa vuota, e PyJWT firmava token con chiave vuota — trivially forgeable.

## Soluzione

Aggiunta funzione \_validate_settings() in main.py, chiamata in lifespan. Valida che effective_secret_key non sia vuota. La validazione forte e solo all'avvio (non all'import), cosi Settings puo ancora essere istanziato senza .env per test.
