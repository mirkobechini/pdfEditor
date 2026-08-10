# Test Coverage — Multi-Platform

> **Scopo:** Documentare la copertura dei test su tutte le piattaforme del progetto: backend (FastAPI/Python), webapp (Next.js/React), desktop (Tauri) e mobile (React Native/Expo).
>
> **Aggiornato:** 2026-08-10

---

## Backend (FastAPI / Python)

| Area                                  | Test                                              | Coverage | Note                                                           |
| ------------------------------------- | ------------------------------------------------- | -------- | -------------------------------------------------------------- |
| Auth (login/register/guest/me/logout) | `test_auth.py`                                    | ✅       | Login, register, guest, logout, getMe, token refresh, CSRF     |
| Google OAuth                          | `test_google_oauth.py`                            | ✅       | Login con token Google, validazione                            |
| CSRF protection                       | `test_csrf.py`, `test_csrf_validation.py`         | ✅       | Cookie, header, cross-origin, upload with/without CSRF         |
| PDF upload/download                   | `test_upload.py`                                  | ✅       | Upload valido, estensione, contenuto, dimensione, pagine, auth |
| PDF merge/split/reorder               | `test_merge_split.py`                             | ✅       | Merge, split, validation                                       |
| Metadata                              | `test_metadata.py`                                | ✅       | Lettura/scrittura metadati                                     |
| Text search/replace                   | `test_text.py`                                    | ✅       | Ricerca testo, replace                                         |
| Protect/unlock                        | `test_protect.py`                                 | ✅       | Password encryption/decryption                                 |
| Undo/redo                             | `test_undo_redo.py`                               | ✅       | Storico modifiche                                              |
| Storage                               | `test_storage.py`, `test_s3_storage.py`           | ✅       | Locale e cloud (S3)                                            |
| Security                              | `test_security.py`                                | ✅       | Token JWT, hash, encoding                                      |
| License                               | `test_license.py`, `test_license_enforcement.py`  | ✅       | Tier, enforcement                                              |
| Admin                                 | `test_admin_send_reset.py`                        | ✅       | Reset password admin                                           |
| Config                                | `test_config.py`                                  | ✅       | Configurazione                                                 |
| Database                              | `test_database.py`                                | ✅       | Migration, sessioni                                            |
| Sync                                  | `test_sync.py`                                    | ✅       | Sync bidirezionale                                             |
| Health                                | `test_health.py`                                  | ✅       | Endpoint health                                                |
| Errori                                | `test_validation_errors.py`, `test_edge_cases.py` | ✅       | Errori, edge cases                                             |

**Totale: 359+ test, ~94% coverage**

---

## Webapp (Next.js / React)

| Area          | Test         | Coverage | Note                        |
| ------------- | ------------ | -------- | --------------------------- |
| Auth UI       | `test_login` | ✅       | 22 test login + remember-me |
| Componenti UI | Vari         | ✅       | ~75% coverage               |

**Totale: 363+ test, ~75% coverage**

---

## Desktop (Tauri v2)

| Area                      | Test | Coverage | Note                                                                                                                                            |
| ------------------------- | ---- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nessun test specifico** | —    | ❌       | Le funzionalità desktop sono testate indirettamente dai test frontend web (stessa codebase Next.js). Il sidecar e il Rust Tauri non hanno test. |

---

## Mobile (React Native / Expo)

| Area                              | Test                                        | Coverage | Note                                                                          |
| --------------------------------- | ------------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| API client                        | `api.test.ts`                               | ✅       | 15 test: login, register, guest, getMe, listPdfs, upload, CSRF, token, errori |
| Auth context                      | `auth.test.ts`                              | ✅       | Login, register, guest, logout, session restore, token persistence            |
| DB locale                         | `localDb.test.ts`                           | ✅       | 9 test: save/get/delete, cloud_synced helper, orphan/unsynced queries         |
| PDF service                       | `pdfService.test.ts`, `pdfService2.test.ts` | ✅       | Merge, split, reorder, remove pages, protect/unlock, metadata                 |
| Error mapping                     | `error-map.test.ts`                         | ✅       | Mappatura errori API → i18n                                                   |
| useCloudSync hook                 | —                                           | ❌       | Non testato (richiede mock di netinfo, AsyncStorage, fetch)                   |
| SettingsScreen                    | —                                           | ❌       | Non testato (UI components)                                                   |
| HomeScreen                        | —                                           | ❌       | Non testato (UI components)                                                   |
| Dialog (conflict, import, delete) | —                                           | ❌       | Non testati (UI components)                                                   |

**Totale: 30+ test**

---

## Coverage gaps pianificati

| Gap                                | Issue/Plan                | Priorità |
| ---------------------------------- | ------------------------- | -------- |
| useCloudSync hook                  | Issue #619 work remaining | Media    |
| Dialog UI (conflict/import/delete) | Issue #619 work remaining | Bassa    |
| SettingsScreen                     | Da pianificare            | Bassa    |
| HomeScreen                         | Da pianificare            | Bassa    |
| Desktop Tauri Rust                 | Da pianificare            | Bassa    |
| E2E cross-origin (Playwright)      | T2 in KNOWN_ISSUES.md     | Media    |

---

## Come eseguire i test

```bash
# Backend (Python)
cd backend
pytest -q

# Frontend web (Next.js)
cd frontend
npx vitest run

# Mobile (Expo/React Native)
cd mobile
npx jest
```
