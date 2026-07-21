# Bug B2: `_cleanup_all_pdf_handles` non funziona

**Status:** [x] Completata (2026-07-14, PR #290)
**Priority:** CRITICAL
**Complexity:** Medium

## Problema

In `backend/app/services/pdf_service.py`, la funzione `_cleanup_all_pdf_handles()` chiude tutti gli handle in `_open_pdf_handles`, ma **niente** aggiunge mai handle a quella lista. Tutti i metodi del servizio usano variabili locali per `fitz.open()`, non la lista module-level.

La funzione è chiamata su shutdown ma non fa nulla.

## Soluzione

Opzione A: Rimuovere `_open_pdf_handles` e `_cleanup_all_pdf_handles` se non servono (i fitz handle locali vengono chiusi da `with`/`try-finally`).
Opzione B: Registrare ogni handle aperto in `_open_pdf_handles` e rimuoverlo alla chiusura.

## File da modificare

- `backend/app/services/pdf_service.py`
- `backend/app/main.py` (chiamata a `_cleanup_all_pdf_handles`)
