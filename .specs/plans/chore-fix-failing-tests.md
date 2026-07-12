# Chore: Fix 3 Failing Backend Tests

**Status:** Planning
**Complexity:** Low
**Estimated Time:** 1-2 ore

## Test falliti

### 1. `test_google_oauth.py::TestGoogleAuth::test_google_login_creates_user`

- **Errore:** `AttributeError: 'User' object has no attribute 'google_id'`
- **Causa:** Il modello `User` non ha il campo `google_id`, ma il test lo cerca
- **Soluzione:** Rimuovere `assert user.google_id` dal test (campo non ancora implementato) o aggiungere il campo al modello

### 2. `test_google_oauth.py::TestGoogleAuth::test_google_login_existing_user`

- **Errore:** Stessa causa — cerca `google_id`
- **Soluzione:** Idem

### 3. `test_migration.py::TestMigrationIntegrity::test_downgrade_single_and_upgrade_again`

- **Errore:** `PermissionError: [WinError 32]` — file test.db locked
- **Causa:** Engine SQLAlchemy non dispose correttamente prima di eliminare file temp
- **Soluzione:** Aggiungere `engine.dispose()` esplicito prima di cleanup in test o fixture

## Procedura

Per ogni test fallito:

1. Analizzare la causa precisa
2. Correggere il test (non modificare produzione se non necessario)
3. Eseguire `pytest tests/<file> -x -q` per confermare pass
4. Committare atomicamente
