# Bug B3: Password-protected PDF senza cache restituisce bytes cifrati

**Status:** [ ] Non iniziata
**Priority:** CRITICAL
**Complexity:** Medium

## Problema

In `backend/app/services/pdf_service.py`, `_read_file_with_password()`: se `pdf.is_password_protected` è True ma `pdf_id not in _password_cache`, la funzione non tenta decryption e restituisce i bytes cifrati al chiamante. Questo causa errori downstream quando il chiamante prova a elaborare un PDF cifrato.

## Soluzione

Se `pdf.is_password_protected` è True e non c'è password in cache, lanciare un'eccezione chiara invece di restituire bytes cifrati. Oppure reindirizzare il flusso per richiedere la password all'utente.

## File da modificare

- `backend/app/services/pdf_service.py`
