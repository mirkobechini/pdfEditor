# Bug B12: Check dimensione file inconsistente in convert.py

**Status:** [ ] Non iniziata
**Priority:** HIGH
**Complexity:** Low

## Problema

In `backend/app/api/v1/convert.py:114`, `import_file` usa `file.file.read(max_bytes + 1)` e poi `if len(content) > max_bytes:`. In `upload.py` invece il check è `>=`. Inoltre, con `read(max_bytes + 1)`, un file di `max_bytes + 2` viene letto solo fino a `max_bytes + 1` e il check `>` non lo rileva — bypassabile.

## Soluzione

Uniformare a `>=` come in `upload.py` e aggiungere commento sulla logica.

## File da modificare

- `backend/app/api/v1/convert.py`
