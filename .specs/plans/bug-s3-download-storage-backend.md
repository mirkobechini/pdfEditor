# Bug: Download PDF fallisce con backend S3

**Status:** ✅ Completata (2026-07-14, PR #284)
**Priority:** HIGH
**Complexity:** Medium

## Problema

Con `STORAGE_BACKEND=s3`, l'upload PDF creava correttamente il record ma il download falliva con errore:

- `PDF file not found on disk`

Il viewer non riusciva ad aprire il file.

## Root cause

`PdfService.get_file_content()` leggeva solo da path locale (`get_pdf_path`) invece di usare l'astrazione storage cross-backend.

## Soluzione

- Refactor in `backend/app/services/pdf_service.py`:
  - `get_file_content()` ora usa `app.core.storage.get_file_content(file_uuid)`
- Test regressione aggiunto:
  - `backend/tests/test_upload.py::test_download_pdf_s3_backend`

## Outcome

Download/preview funzionano correttamente sia con backend locale che S3.
