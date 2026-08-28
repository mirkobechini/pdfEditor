# Test Coverage — Multi-Platform

> **Scopo:** Documentare la copertura dei test su tutte le piattaforme del progetto: backend (FastAPI/Python), webapp (Next.js/React), desktop (Tauri) e mobile (React Native/Expo).
>
> **Aggiornato:** 2026-08-28

---

## Riepilogo

| Piattaforma                    | Test runner | Test    | Coverage   | Stato |
| ------------------------------ | ----------- | ------- | ---------- | ----- |
| **Backend** (FastAPI/Python)   | pytest      | **371** | **88%**    | ✅    |
| **Webapp** (Next.js/React)     | vitest      | **565** | **94.96%** | ✅    |
| **Desktop** (Tauri)            | vitest      | **897** | **91.41%** | ✅    |
| **Mobile** (React Native/Expo) | jest        | **272** | **98.7%**  | ✅    |

> ℹ️ **Desktop**: 897 test frontend (Vitest) + 3 test Rust (cargo test). CI dedicata `ci-desktop.yml`. Target 90% raggiunto (issue #693): **91.41% statements, 94.88% lines**.
>
> ⚠️ **Nota:** `ReorderPagesModal` ha i callback DnD (`@dnd-kit/core`) non copribili in jsdom — richiedono test E2E con Playwright. Coverage ferma a 81.17% per quel file.
>
> ℹ️ **Mobile**: 272 test (jest). Target 90% raggiunto (issue #696): **98.7% statements, 100% lines**. Tutti i file a 100% tranne `api.ts` (96.73%).
>
> ℹ️ **Webapp**: 565 test (Vitest). Target 90% raggiunto (issue #700): **94.96% statements, 97.34% lines**. Tutti i file >= 90% statements.

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

**Coverage: 94.96% statements, 97.34% lines (565 test)** — issue #700

| Area                                      | Test                                            | Coverage | Note                                                           |
| ----------------------------------------- | ----------------------------------------------- | -------- | -------------------------------------------------------------- |
| Auth provider                             | `auth.test.tsx`                                 | ✅       | login, register, guest, logout, session restore, refresh       |
| Auth pages                                | `login/page.test.tsx`, `register/page.test.tsx` | ✅       | login 93.61%, register 97.29% (incl. convert guest)            |
| Lib (tauri, pdfjs)                        | `tauri.test.ts`, `usePdfJs.test.tsx`            | ✅       | tauri 96.15%, usePdfJs 94.11%                                  |
| EditorPage                                | `app/__tests__/page.test.tsx`                   | ✅       | 92.14% — dead code rimosso (5 handler inutilizzati)            |
| Sidebar                                   | `Sidebar.test.tsx`                              | ✅       | 92.42%                                                         |
| PdfViewer                                 | `PdfViewer.test.tsx`                            | ✅       | 92.79%                                                         |
| HeaderControls                            | `HeaderControls.test.tsx`                       | ✅       | 96.55% — listener preferenza sistema dark mode                 |
| Admin                                     | `admin/__tests__/AdminPage.test.tsx`            | ✅       | 95.04% (filtri, license, bug reports)                          |
| Dialoghi (metadata, bug report, merge...) | Vari                                            | ✅       | MetadataDialog 97.77%, BugReportDialog 96.66%, tutti >= 90%    |
| Componenti vari                           | Vari                                            | ✅       | PasswordInput 100%, GuestConvertBanner 100%, ClientLayout 100% |
| Layout & home                             | `layout-pages.test.tsx`                         | ✅       | home page 100% (redirect Tauri), ClientLayout 100%             |

**Totale: 565 test, 94.96% statements — tutti i file >= 90%**

---

## Mobile (React Native / Expo)

**Coverage: 98.7% statements, 100% lines (272 test)** — issue #696

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
