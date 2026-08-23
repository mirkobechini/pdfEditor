# Test Coverage — Multi-Platform

> **Scopo:** Documentare la copertura dei test su tutte le piattaforme del progetto: backend (FastAPI/Python), webapp (Next.js/React), desktop (Tauri) e mobile (React Native/Expo).
>
> **Aggiornato:** 2026-08-23

---

## Riepilogo

| Piattaforma                    | Test runner | Test    | Coverage   | Stato |
| ------------------------------ | ----------- | ------- | ---------- | ----- |
| **Backend** (FastAPI/Python)   | pytest      | **371** | **88%**    | ✅    |
| **Webapp** (Next.js/React)     | vitest      | **363** | ~75%       | ✅    |
| **Desktop** (Tauri)            | vitest      | **375** | **71%**    | ✅    |
| **Mobile** (React Native/Expo) | jest        | **182** | ~77% lines | ✅    |

> ℹ️ **Desktop**: 370 test frontend (Vitest) + 3 test Rust (cargo test). CI dedicata `ci-desktop.yml`.

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

**Totale: 369 test, ~94% coverage**

---

## Webapp (Next.js / React)

| Area          | Test         | Coverage | Note                        |
| ------------- | ------------ | -------- | --------------------------- |
| Auth UI       | `test_login` | ✅       | 22 test login + remember-me |
| Componenti UI | Vari         | ✅       | ~75% coverage               |

**Totale: 363 test, ~75% coverage**

---

## Mobile (React Native / Expo)

| Area                              | Test                          | Coverage | Note                                                                                                                                                                                 |
| --------------------------------- | ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API client                        | `api.test.ts`                 | ✅       | **30 test**: login, register, guest, getMe, listPdfs, upload, download, merge, split, reorder, remove, metadata, unlock, protect, forgotPassword, resetPassword, CSRF, token, errori |
| Auth integration                  | `auth.test.ts`                | ✅       | 7 test: login, register, guest, logout, session restore, token persistence                                                                                                           |
| Auth storage logic                | `AuthStorage.test.ts`         | ✅       | 9 test: token persistence, user cache, CSRF token persistenza                                                                                                                        |
| Auth provider logic               | `AuthProvider.test.ts`        | ✅       | 10 test: restoreSession, login flow, register, guestLogin, logout, forgotPassword                                                                                                    |
| DB locale                         | `localDb.test.ts`             | ✅       | 9 test: save/get/delete, cloud_synced helper, orphan/unsynced queries                                                                                                                |
| PDF service (pdf-lib)             | `pdfService.test.ts`          | ✅       | 7 test: merge, split, reorder, metadata in memory                                                                                                                                    |
| PDF service (full)                | `pdfServiceFull.test.ts`      | ✅       | 15 test: mergePdfs, splitPdf, reorderPages, removePages, updateMetadata, isPdfEncrypted, protectPdf, unlockPdf                                                                       |
| PDF service (remove)              | `pdfService2.test.ts`         | ✅       | 2 test: removePages null cases                                                                                                                                                       |
| Error mapping                     | `error-map.test.ts`           | ✅       | 13 test: mappatura errori API → i18n                                                                                                                                                 |
| Cloud sync API                    | `cloudSyncApi.test.ts`        | ✅       | 4 test: uploadPdf, listPdfs, getPdf, deletePdf via API                                                                                                                               |
| AppSettingsContext                | `AppSettingsContext.test.tsx` | ✅       | 8 test: theme mode persistenza, locale persistenza                                                                                                                                   |
| OnboardingContext                 | `OnboardingContext.test.tsx`  | ✅       | 5 test: completed default, true, false, completeOnboarding, resetOnboarding                                                                                                          |
| usePdfStorage logic               | `usePdfStorage.test.ts`       | ✅       | 3 test: loadLocalPdfs, removeLocalPdf, savePdfLocally                                                                                                                                |
| useSyncQueue logic                | `useSyncQueue.test.ts`        | ✅       | 7 test: loadQueue, saveQueue, enqueue, removeItem, clearQueue                                                                                                                        |
| i18n configuration                | `i18n.test.ts`                | ✅       | 5 test: getSystemLanguage EN/IT/fallback, supportedLanguages                                                                                                                         |
| useCloudSync hook                 | `useCloudSync.test.ts`        | ✅       | 2 test: API upload fallisce, PDF non trovato                                                                                                                                         |
| SettingsScreen                    | —                             | ❌       | Non testato (UI components)                                                                                                                                                          |
| HomeScreen                        | —                             | ❌       | Non testato (UI components)                                                                                                                                                          |
| Dialog (conflict, import, delete) | —                             | ❌       | Non testati (UI components)                                                                                                                                                          |
| OnboardingWizard                  | —                             | ❌       | Non testato (UI components)                                                                                                                                                          |

**Totale: 182 test**

---

## Coverage gaps pianificati

| Gap                                | Issue/Plan                                                 | Priorità |
| ---------------------------------- | ---------------------------------------------------------- | -------- |
| Desktop: componenti sotto 70%      | Settings (51%), Profile (38%), Startup (46%), Wizard (66%) | 🔴 Alta  |
| Desktop: PdfViewer (57%)           | Rendering, spinner, page navigation                        | Media    |
| Desktop: GoogleLoginButton (40%)   | Desktop redirect flow, error polling                       | Media    |
| Desktop: useCloudSync hook         | Issue #619 work remaining                                  | Media    |
| Dialog UI (conflict/import/delete) | Issue #619 work remaining                                  | Bassa    |
| SettingsScreen / HomeScreen        | Da pianificare                                             | Bassa    |
| OnboardingWizard (UI)              | Da pianificare                                             | Bassa    |
| Desktop Tauri Rust                 | Da pianificare                                             | Bassa    |
| E2E cross-origin (Playwright)      | T2 in KNOWN_ISSUES.md                                      | Media    |

---

## Come eseguire i test

### Singola piattaforma

```bash
# Backend (Python) — pytest
cd backend
python -m pytest -q

# Frontend web (Next.js) — vitest
cd frontend
npx vitest run

# Mobile (Expo/React Native) — jest
cd mobile
npx jest
```

### Full suite (tutte le piattaforme in sequenza)

```bash
# Bash (macOS/Linux/Git Bash)
bash run-all-tests.sh

# PowerShell (Windows)
.\run-all-tests.ps1
```

### Desktop (Tauri)

370 test frontend (Vitest) + 3 test Rust (cargo test). CI dedicata `ci-desktop.yml`.

| Componente                     | Test | Coverage | Note                                              |
| ------------------------------ | ---- | -------- | ------------------------------------------------- |
| Editor page (app/app/page.tsx) | 47   | 70%      | Modali, drag&drop, upload, download, zoom, delete |
| Login page                     | 18   | 71%      | Form submission, errori, remember me, guest       |
| Register page                  | 10   | 95%      | Validazione, submission, errori                   |
| Settings page                  | 21   | 51%      | Tutti i tab, about, language, density             |
| Wizard page                    | 26   | 66%      | Step navigation, checkbox, folder, skip/finish    |
| Profile page                   | 8    | 38%      | User info, logout, google unlink                  |
| Startup page                   | 6    | 46%      | Steps, loading                                    |
| LockUnlockModal                | 14   | 97%      | Lock/unlock, password validation, eye toggle      |
| MergeModal                     | 7    | 97%      | Checkbox selection, merge API call                |
| MetadataModal                  | 7    | 77%      | Metadata fields, save, error                      |
| RemovePagesModal               | 7    | 66%      | Page selection, remove, error                     |
| ReorderPagesModal              | 7    | 58%      | DnD, reorder API call, error                      |
| SplitPagesModal                | 7    | 74%      | Split point, split API call, error                |
| PdfViewer                      | 5    | 57%      | Canvas, PDF.js loading, no-file placeholder       |
| GoogleLoginButton              | 5    | 40%      | Desktop/web, no-client-id fallback                |
| PasswordInput                  | 5    | 80%      | Eye toggle, onChange, required                    |
| auth.tsx                       | 17   | 74%      | Login, register, logout, guestLogin, Tauri paths  |
| api.ts                         | 33   | 85%      | CRUD, admin, edge cases, refresh token            |
| error-map.ts                   | 26   | 91%      | Tutti i codici errore, test edge case             |
| tauri.ts                       | 7    | 100%     | isTauri, tauriInvoke, getApiBaseUrl               |
| preferences.tsx                | 4    | 71%      | Load, fallback, update, error                     |
| i18n.tsx                       | 2    | 100%     | Locale switching                                  |

**Rust (Tauri commands):** 3 test (get_sidecar_port, read_file_binary)

```bash
# Desktop frontend (Next.js/React) — vitest
cd desktop/frontend
npx vitest run

# Desktop Tauri (Rust) — cargo test
cd desktop/src-tauri
cargo test
```
