# Chore: Backend 100% Test Coverage

**Status:** Planning
**Complexity:** Medium
**Estimated Time:** 3-5 ore

## Obiettivo

Portare la copertura dei test backend dal 83% al 100%, coprendo i moduli scoperti.

## Moduli da coprire

| Modulo             | Coverage attuale | Strategia                                                                          |
| ------------------ | ---------------- | ---------------------------------------------------------------------------------- |
| `s3_storage.py`    | 0% — 69 linee    | Mock boto3, test upload/download/delete/snapshots (2-3 test)                       |
| `email_service.py` | 33% — 24 linee   | Mock SMTP, test send_password_reset_email con success/error (3-4 test)             |
| `storage.py`       | 62%              | Test snapshot flow (save/get/pop/clear), test get_file_content (2-3 test)          |
| `main.py`          | 67%              | Test middleware request-id, test CORS headers, test lifespan (2-3 test)            |
| `database.py`      | 57%              | Test `get_db` context manager, test engine creation (1-2 test)                     |
| `config.py`        | ~10%             | Test effective_secret_key, allowed_origins_list, normalize_database_url (2-3 test) |
| `api/v1/auth.py`   | ~90%             | Test `PUT /auth/me` (profile update) — 2 test                                      |
| `api/v1/upload.py` | ~95%             | Test `DELETE /pdfs/{id}` — 1 test                                                  |

## Strategia

Ogni test:

1. Viene scritto come file separato o aggiunto a file esistente
2. Usa `conftest.py` fixtures (`client`, `free_headers`, `sample_pdf_content`, ecc.)
3. Copre sia happy path che error path
4. Mocka dipendenze esterne (boto3, smtplib)

## Output atteso

- `pytest --cov=app --cov-report=term` mostra 100% su tutti i moduli
- 0 nuove dipendenze
- Test eseguibili sia con SQLite che PostgreSQL
