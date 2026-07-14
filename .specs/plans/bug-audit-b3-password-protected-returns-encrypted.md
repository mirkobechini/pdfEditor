# Bug B3: Password-protected PDF senza cache restituisce bytes cifrati

**Status:** [x] Completata (2026-07-14, PR #292)
**Priority:** CRITICAL
**Complexity:** Low

## Problema

Alla riga 68-75 di `backend/app/services/pdf_service.py`, `_read_file_with_password()`: se `pdf.is_password_protected` è True ma `pdf_id not in _password_cache`, la funzione restituiva bytes cifrati.

## Soluzione

Aggiunto check esplicito: se PDF è password-protetto e non c'è password in cache, lancia `ValueError("PDF is password protected. Please unlock it first.")`.

## File modificati

- `backend/app/services/pdf_service.py`
