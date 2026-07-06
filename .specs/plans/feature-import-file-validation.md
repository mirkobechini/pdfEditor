# Feature: File Validation for /pdfs/import Endpoint

**Issue Number**: issue-138

## Obiettivo

Aggiungere validazione completa per l'endpoint POST `/pdfs/import`:

1. Controllare dimensione file (max MAX_UPLOAD_SIZE_MB, come per upload PDF)
2. Validare MIME type oltre extension
3. Aggiungere test parametrizzato per tutti i formati

## Problema

Attualmente l'endpoint `/pdfs/import` (convert.py) ha validazione extension ma:

- ❌ Nessun controllo dimensione file (utente potrebbe uploadare 5GB!)
- ❌ MIME type non validato
- ❌ Test non parametrizzato per tutti i format (PNG, JPG, JPEG, GIF, BMP, TXT)

Risk: OOM del backend se carica file gigante.

## Dipendenze

- Backend API: backend/app/api/v1/convert.py (funzione import_file)
- Config: backend/app/core/config.py (MAX_UPLOAD_SIZE_MB)
- Test: backend/tests/test_convert.py

## Stack

- Backend: FastAPI + Pydantic
- Testing: pytest 7.x

## Output atteso

✅ Validazione completa in convert.py:

1. Controllo dimensione file prima di read()
2. Validazione MIME type nella mappa IMPORT_MIME_MAP
3. Messaggio d'errore 413 (REQUEST_ENTITY_TOO_LARGE) se file > MAX_UPLOAD_SIZE_MB
4. Test parametrizzato per [TXT, PNG, JPG, JPEG, GIF, BMP]
5. Test per file corrotto e file troppo grande

## Accettazione Criteria

- [ ] Aggiunto controllo MAX_UPLOAD_SIZE_MB in import_file()
- [ ] Aggiunto MIME type validation
- [ ] Test parametrizzato @pytest.mark.parametrize per 6 formati
- [ ] Test file size limit (mock large file)
- [ ] Test file corrotto
- [ ] Tutti i test passano: `pytest backend/tests/test_convert.py::TestImport -v`
- [ ] No file read in memory se > limit

## Status

- [ ] Non iniziata
- [ ] In progress
- [ ] In review
- [ ] Completata

## Timeline

Stimato: 1.5 ore (backend validation + test)

## Note

- Riusare logica MAX_UPLOAD_SIZE_MB da upload.py
- Aggiungere IMPORT_MIME_MAP di mapping extension → MIME type
- Test with io.BytesIO per mock file objects
