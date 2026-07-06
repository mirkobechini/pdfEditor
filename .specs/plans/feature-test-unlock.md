# Feature: Tests for PDF Unlock Endpoint

**Issue Number**: issue-143

## Obiettivo

Aggiungere test per `POST /pdfs/{pdf_id}/unlock`. Attualmente non esiste alcun test per questo endpoint.

## Problema

- `unlock.py` ha 3 percorsi: password vuota (400), password errata (403), unlock OK (200)
- ❌ Nessun test coverage per questi percorsi
- Il flusso "PDF già non protetto" non è testato

## Dipendenze

- `backend/tests/test_unlock.py` (nuovo file, o aggiungere a test esistenti)
- `backend/app/api/v1/unlock.py` — endpoint
- `backend/app/services/pdf_service.py` — `unlock()` method
- `conftest.py` — fixtures (client, free_headers, upload_pdf, sample_pdf_content)

## Stack

- Backend: FastAPI + pytest
- PDF: PyMuPDF (fitz) per creare PDF protetti da password

## Output atteso

✅ Test in `backend/tests/test_unlock.py`:

1. **test_unlock_not_protected** — PDF non protetto → unlock "riuscito" senza fare nulla
2. **test_unlock_success** — PDF protetto + password corretta → 200 + metadati PDF
3. **test_unlock_wrong_password** — PDF protetto + password errata → 403
4. **test_unlock_empty_password** — Password vuota → 400
5. **test_unlock_unauthorized** — Senza token → 401

## Accettazione Criteria

- [ ] File test creato: test_unlock.py
- [ ] 5+ test cases implementati
- [ ] PDF protetto generato con PyMuPDF `encrypt()` per test
- [ ] Tutti i test passano: `pytest backend/tests/test_unlock.py -v`
- [ ] Upload del PDF protetto via `upload_pdf()` helper

## Status

- [ ] Non iniziata
- [ ] In progress
- [ ] In review
- [ ] Completata

## Timeline

Stimato: 45 minuti

## Note

- Usare `sample_pdf_content` per creare PDF base
- Per creare PDF protetto: aprire con fitz, `doc.save()` con `encryption="pdfstd"` e `user_pw="test123"`
- Per testare 401: non passare `free_headers`
- Usare helper `upload_pdf(client, free_headers, content, filename="protected.pdf")`

```python
# Esempio creazione PDF protetto
import fitz
doc = fitz.open(stream=sample_pdf_content, filetype="pdf")
data = doc.tobytes(encryption="pdfstd", user_pw="test123")
```
