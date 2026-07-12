# Chore: Extract Shared License Seed Data

**Status:** Planning
**Priority:** BASSA (Refactoring)
**Complexity:** Low
**Estimated Time:** 30 min

---

## Problema

La stessa lista di license features è definita in **2 posti**:
1. `backend/app/main.py` — `_seed_license_features()` (produzione)
2. `backend/tests/conftest.py` — seed nei test

Se si aggiunge/modifica una feature, va aggiornata in entrambi i posti. Prima o poi qualcuno si dimenticherà.

## Soluzione

Estrarre i dati di seed in un file condiviso:

```python
# backend/app/core/license_seed.py
"""Default license features for seeding."""

DEFAULT_LICENSE_FEATURES = [
    ("free", "upload_pdf"), ("free", "download_pdf"), ("free", "extract_text"),
    ("pro", "upload_pdf"), ("pro", "download_pdf"), ("pro", "extract_text"),
    ("pro", "merge_pdf"), ("pro", "split_pdf"), ("pro", "reorder_pages"),
    ("pro", "remove_pages"), ("pro", "replace_text"), ("pro", "edit_metadata"),
    ("pro", "export_txt"), ("pro", "export_png"), ("pro", "export_jpg"),
    ("pro", "import_txt"), ("pro", "max_file_size_50mb"),
    ("enterprise", "upload_pdf"), ("enterprise", "download_pdf"),
    ("enterprise", "extract_text"), ("enterprise", "merge_pdf"),
    ("enterprise", "split_pdf"), ("enterprise", "reorder_pages"),
    ("enterprise", "remove_pages"), ("enterprise", "replace_text"),
    ("enterprise", "edit_metadata"), ("enterprise", "export_txt"),
    ("enterprise", "export_png"), ("enterprise", "export_jpg"),
    ("enterprise", "export_svg"), ("enterprise", "import_txt"),
    ("enterprise", "import_images"), ("enterprise", "max_file_size_100mb"),
]
```

Poi:
- `main.py` importa da `license_seed.py`
- `conftest.py` importa da `license_seed.py`

## Files da creare

- `backend/app/core/license_seed.py`

## Files da modificare

- `backend/app/main.py` — Usa `DEFAULT_LICENSE_FEATURES`
- `backend/tests/conftest.py` — Usa `DEFAULT_LICENSE_FEATURES`

## Acceptance Criteria

- [ ] `main.py` e `conftest.py` usano la stessa fonte dati
- [ ] 228 test passano
- [ ] Nessuna duplicazione