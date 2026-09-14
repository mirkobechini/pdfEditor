# Known Issues & Technical Debt

> **Scopo:** Tracciare bug minori, debito tecnico e miglioramenti che non hanno rilevanza architetturale (non vanno in `ADR.md`).  
> **Aggiornato:** 2026-09-11

---

## ✅ Risolte in v0.1.35 (Sep 2026)

| Issue | Fix                                                                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B3    | Google login desktop (JWT sync corretto)                                                                                                                     |
| B4    | Startup page fallback rimosso (no silent passthrough)                                                                                                        |
| B5    | Wizard finish va a `/login` invece di `/app`                                                                                                                 |
| T3    | Migration auto-detect colonne mancanti                                                                                                                       |
| B2    | Replace text su web/desktop/mobile (preserva formato)                                                                                                        |
| #712  | Keep-warm 14min invece di 5min (fix compute exhaustion)                                                                                                      |
| #714  | CI release-desktop parte subito (no timeout 15min)                                                                                                           |
| CVE   | Security fix @xmldom/xmldom DoS vulnerability                                                                                                                |
| #718  | Mobile: auto-refresh 401 gestisce formato errore {code, detail}                                                                                              |
| #725  | Desktop: 500 su /pdfs — `_add_missing_columns` popola NULL con default                                                                                       |
| #727  | Desktop: download sidecar 403 — `syncResult` per token locale dopo login Google                                                                              |
| #728  | Upload cloud 403 CSRF — esentato CSRF per richieste Bearer-authenticated                                                                                     |
| #732  | Rename PDF: `Sidebar.tsx` salva via `updateMetadata(id, { new_filename })`                                                                                   |
| #733  | Merge CSRF: `_fetch` garantisce `X-CSRF-Token` prima dei POST state-changing                                                                                 |
| #736  | Test E2E merge riabilitato + `e2e/**` nei paths CI + license enforcement off                                                                                 |
| #737  | Merge/split S3: `pdf_merge_split_service` usa `get_file_content()` (S3-aware)                                                                                |
| #749  | K5: auth offline — profilo utente salvato in cache per uso offline                                                                                           |
| #757  | Google login CI: `verify_oauth2_token` chiamato anche con audience vuota                                                                                     |
| #761  | Refactor unify: web re-exporta tauri/error-map dal shared; `api.ts` web ripristinato originale cookie-based (il re-export shared rompeva login/register e2e) |

---

## 🔴 Bug aperti

### K6 — Disinstallazione non cancella dati utente in %APPDATA%

**File:** `desktop/src-tauri/installer.nsh`  
**Descrizione:** L'uninstall di NSIS cancella solo i file in `C:\Program Files\PdfEditor/`, non i dati utente in `%APPDATA%/PdfEditor/` (PDF, DB SQLite, secret.key). Reinstallando l'app, i vecchi PDF e utenti sono ancora presenti.

**Comportamento:** Voluto — è lo standard Windows (Chrome, Discord, Spotify fanno lo stesso). I dati utente sono separati dall'applicazione.

**Se in futuro si volesse cambiare:** Aggiungere una MessageBox in `NSIS_HOOK_PREUNINSTALL` che chiede "Vuoi cancellare anche i tuoi PDF e dati utente?" e, se confermato, cancella `%APPDATA%/PdfEditor/`.

**Stato:** Non pianificato.

## 🟡 Bug minori rimanenti

Tutti i bug minori precedenti sono stati risolti.

---

## 🔵 Debito tecnico

### T2 — Test E2E cross-origin (Playwright) — ✅ PARZIALE

**Descrizione:** 375 test backend (con `TestClient` same-origin) + 907 test desktop (vitest) + 279 test mobile. I test unitari non coprono i flussi cross-origin reali (cookie, CSRF, CORS).  
**Risoluzione prevista:** Playwright (T7).  
**Stato:** ✅ **Parziale (2026-09-12)** — Suite E2E Playwright in `e2e/` con **15 test verdi** (auth, CSRF/CORS, upload PDF, download, delete, merge, cloud sync, token refresh). Job `e2e` aggiunto a `ci-web.yml` con `e2e/**` nei paths. Il backend E2E parte con `DISABLE_LICENSE_ENFORCEMENT=true`. I flussi PDF avanzati (split/reorder/protect) restano fragili in E2E (pdf.js) e coperti da pytest. Vedi `.specs/active/roadmap-test-e2e.md`.

**Nota (2026-09-12):** Il testing E2E del binario desktop Tauri **non è fattibile con Playwright** — Tauri usa WebDriver (Selenium/WebdriverIO) + `tauri-driver`. Se in futuro si vuole testare il binario desktop reale, usare **WebdriverIO + tauri-driver** (richiede build Tauri + sidecar PyInstaller, costoso in CI). I flussi desktop-specifici sono già coperti dai test unitari vitest (917 test).

### T3 — `@swc/helpers` lock file desync

**Descrizione:** `npm ci` fallisce se `package-lock.json` non contiene `@swc/helpers@0.5.23`. Succede quando si installa `@tauri-apps/plugin-dialog` o altri pacchetti che modificano la risoluzione delle dipendenze.
**Soluzione:** `rm package-lock.json && npm install @swc/helpers@^0.5.23 --save-dev && npm ci`
**Prevenzione:** Il preflight check cattura questo errore prima del tag.

### T4 — Tauri CLI via npm: `npm run tauri build` richiede `@tauri-apps/cli` installato

**Descrizione:** Il nuovo sistema di build usa `@tauri-apps/cli` via npm. Se il pacchetto non è installato (es. `npm ci` fallito), la build fallisce.
**Risoluzione prevista:** Il preflight job in CI verifica che `npm ci` + `next build` funzionino prima di avviare la build Tauri.

---

## 📱 Bug/limitazioni mobile

### M4 — Password protect/unlock PDF (F4) ✅

**File:** `mobile/src/services/pdfService.ts`, `mobile/src/screens/ToolsScreen.tsx`
**Descrizione:** Implementato con `@cantoo/pdf-lib@2.8.1` che supporta encryption/decryption. UI in ToolsScreen con dialog per protect (conferma password) e unlock (password singola). Funzionante in APK standalone.
**Stato:** ✅ Risolto (issue #622).

### M3 — `react-native-pdf` non rimonta il viewer per un secondo PDF

**File:** `mobile/src/screens/PdfViewerScreen.tsx`
**Descrizione:** Il viewer non si aggiorna quando si apre un secondo PDF perché il componente non viene rimontato. Fix: `key={refreshKey}` incrementata in `useEffect([pdfId])` **dopo** aver settato `pdfUri`.
**Stato:** Risolto (Build #6). Documentato come pattern obbligatorio.

### M2 — Dynamic import non funziona in APK standalone

**File:** `mobile/src/services/pdfService.ts`, `mobile/src/screens/ScannerScreen.tsx`
**Descrizione:** `await import("expo-file-system")` a runtime non risolve in APK standalone — rompe pdfService e Scanner. **Regola:** SEMPRE import statici.
**Stato:** Risolto (Build #6). Lezione in `LESSONS_LEARNED.md`.

### M1 — `.easignore` pattern non ancorati escludevano `mobile/src/shared/`

**File:** `.easignore` (root)
**Descrizione:** Pattern senza `/` iniziale matchavano a qualsiasi profondità, escludendo `mobile/src/shared/` → Metro non trovava auth/api. Fix: ancorare tutti i pattern con `/` (es. `/shared/`, `/*.png`).
**Stato:** Risolto (Build #5). Documentato in `mobile/ADR.md`.

### M0 — Sync cloud PDF mobile ✅ (parziale)

**File:** `mobile/src/hooks/useCloudSync.ts`, `mobile/src/screens/SettingsScreen.tsx`, `mobile/src/screens/HomeScreen.tsx`
**Descrizione:** Sync bidirezionale implementato (upload/download/conflitti), onboarding wizard, dialog conflitti/import/delete, badge sync in Home, progress bar, trigger all'avvio e background.
**Stato:** ✅ Implementato (issue #619). **Nota:** token JWT scade dopo 1h — refresh automatico implementato in issue #623 (endpoint `/auth/refresh` + retry automatico su tutte le piattaforme).

## 📊 Coverage gaps (non bloccanti)

| Area                       | Coverage              | Bloccante? | Note                                                                                          |
| -------------------------- | --------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| Backend totale             | 94% (359 test)        | ❌ No      | 1 pre-existing fail (test_seed_super_admin)                                                   |
| **Webapp totale**          | **94.96% (565 test)** | ❌ No      | Target 90% raggiunto (issue #700). Tutti i file >= 90% statements                             |
| **Desktop totale**         | **90.84% (906 test)** | ❌ No      | Target 90% raggiunto (issue #693). +9 test ReplaceTextModal, +3 test googleLogin token locale |
| **Mobile totale**          | **98.7% (276 test)**  | ❌ No      | +4 test api replaceText                                                                       |
| Desktop: Settings/Profile  | 51% / 38%             | ❌ No      | Da migliorare (non bloccante)                                                                 |
| Desktop: Wizard/Startup    | 66% / 46%             | ❌ No      | Da migliorare (non bloccante)                                                                 |
| Desktop: PdfViewer         | 81.7%                 | ❌ No      | Rendering PDF.js in jsdom                                                                     |
| Desktop: GoogleLoginButton | 76.31%                | ❌ No      | Redirect flow difficile da testare                                                            |
| ReorderPagesModal DnD      | 81.17%                | ❌ No      | DnD handlers (@dnd-kit) non copribili in jsdom — richiedono test E2E con Playwright           |

---

## 🧪 Dipendenze con warning (Dependabot)

| #      | Pacchetto                        | Severità    | Versione             | Stato                    | Note                                                                                                                                                                                                                                                                                      |
| ------ | -------------------------------- | ----------- | -------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **51** | `nanoid` (mobile)                | 🔴 high     | < 3.3.18             | ✅ **Fixato (override)** | Sub-dipendenza di react-navigation + expo. Override in mobile/package.json a 3.3.18.                                                                                                                                                                                                      |
| **50** | `image-size` (mobile)            | 🔴 high     | <= 2.0.2             | ⛔ **Non fixabile**      | Sub-dipendenza di expo (metro). Nessun fix disponibile.                                                                                                                                                                                                                                   |
| **49** | `image-size` (mobile)            | 🔴 high     | <= 2.0.2             | ⛔ **Non fixabile**      | Stesso di #50.                                                                                                                                                                                                                                                                            |
| **48** | `uuid` (mobile)                  | 🟡 medium   | < 7.0.3              | ⛔ **Non fixabile**      | Sub-dipendenza di xcode → expo-config-plugins. Saltare a 11.1.1 rompe breaking changes.                                                                                                                                                                                                   |
| **32** | `glib::VariantStrIter` (Rust)    | 🟡 medium   | < 0.20.0             | ⏳ **Sconsigliato**      | Dipendenza indiretta di Tauri. Forzare glib 0.20.0 rischia di rompere cargo tauri build. CVE non esposto a input utente.                                                                                                                                                                  |
| —      | `postcss` (path traversal)       | 🔴 high     | 8.4.31 (via Next.js) | ⛔ **Non fixabile**      | Sub-dipendenza interna di `next@16.3.5`. In attesa che Next.js aggiorni il suo sub-dep.                                                                                                                                                                                                   |
| —      | `sharp` / libvips                | 🔴 high     | < 0.35.0             | ✅ **Già a 0.35.4**      | Next.js 16.3.5 include sharp 0.35.4 (PR #781).                                                                                                                                                                                                                                            |
| —      | `brace-expansion`                | 🔴 high     | 1.1.16 / 5.0.8       | ✅ **Falso positivo**    | DevDependency di eslint, non raggiungibile in produzione.                                                                                                                                                                                                                                 |
| —      | `js-yaml`                        | 🔴 high     | 4.0.0 / 4.3.1        | ✅ **Falso positivo**    | DevDependency di eslint, non raggiungibile in produzione.                                                                                                                                                                                                                                 |
| —      | `httpx` + `starlette.testclient` | —           | —                    | ✅ **Risolto**           | starlette 1.6.0 usa `httpx2` (PR #783). Warning deprecazione risolto.                                                                                                                                                                                                                     |
| —      | `next` (web)                     | 🔴 critical | 16.3.0               | ✅ **Fixato (16.3.5)**   | RCE (GHSA-p293-qw3h-jr36, GHSA-2xp9-vwfh-vxw4). Bump a 16.3.5 (PR #781).                                                                                                                                                                                                                  |
| —      | `sharp` (web)                    | 🔴 high     | < 0.35.4             | ✅ **Fixato (0.35.4)**   | libheif (GHSA-rgj7-g3m4-5g8c). Sub-dep di Next.js, risolto con bump next 16.3.5 (PR #781).                                                                                                                                                                                                |
| —      | `pillow` (backend)               | 🔴 high     | 12.2.0               | ⛔ **Non fixabile**      | 20 CVE (PYSEC-2026-3453/54/93/94/95/96). Fix in 12.3.0. In attesa bump.                                                                                                                                                                                                                   |
| —      | `pypdf` (backend)                | 🔴 high     | 6.14.2               | ⛔ **Non fixabile**      | 6 CVE (CVE-2026-84309/10/11, -82398). Fix in 6.16.1. In attesa bump.                                                                                                                                                                                                                      |
| —      | `starlette` (backend)            | 🔴 high     | 0.38.6               | ✅ **Fixato (1.6.0)**    | 14 CVE (PYSEC-2026-161/248/249/1941/1943/2280/2281). Upgrade fastapi 0.141.1 (PR #783). pip-audit: 0 vuln.                                                                                                                                                                                |
| —      | `pyasn1` (backend)               | 🟡 medium   | 0.6.3                | ⛔ **Non fixabile**      | 4 CVE (PYSEC-2026-3455/56/57). Fix in 0.6.4. In attesa bump.                                                                                                                                                                                                                              |
| —      | `cryptography`/`ecdsa`/`httpx`   | 🟡 medium   | —                    | ⛔ **Non fixabile**      | 3 CVE backend. In attesa bump upstream.                                                                                                                                                                                                                                                   |
| —      | `decode-uri-component` (mobile)  | 🟡 medium   | <= 0.4.2             | ⛔ **Non fixabile**      | DoS (GHSA-vcc3-ghjq-m6fr). Nessun fix disponibile.                                                                                                                                                                                                                                        |
| —      | `vitest` (web/desktop)           | 🟡 moderate | 4.x                  | ⛔ **Accettato**         | Path traversal in @vitest/mocker (GHSA-82fw-gwwq-j7x9). DevDependency non esposta in produzione. Fix richiede upgrade major 4→5 (breaking changes: clearMocks default, vi.mock top-level, async assertion, coverage include/exclude). Costo sproporzionato per vuln moderate in dev tool. |

### Vulnerabilità risolte (non più segnalate da Dependabot)

| Pacchetto           | Fix                                                              |
| ------------------- | ---------------------------------------------------------------- |
| `js-yaml`           | PR #392 (bump 4.2.0 → 4.3.0)                                     |
| `next`              | PR #393 (bump 16.2.9 → 16.2.11)                                  |
| `next` (CVE-2026)   | **bump 16.2.11 → 16.3.0** (3 high, 5 medium risolte)             |
| `next` (RCE)        | **PR #781 (bump 16.3.0 → 16.3.5)** — critical RCE risolto        |
| `js-yaml` (CPU DoS) | **PR #781 (bump → 4.3.2)** — high risolto                        |
| `sharp`/libvips     | **PR #781 (via next 16.3.5 → 0.35.4)** — high risolto            |
| `starlette`         | **PR #783 (fastapi 0.141.1 → starlette 1.6.0)** — 14 CVE risolte |
| `python-multipart`  | PR #395 (bump 0.0.31 → 0.0.32)                                   |
| `PyJWT`             | Già a 2.13.0 (fixato)                                            |
| `python-jose`       | Rimosso (non in uso)                                             |

### ⚠️ Vulnerabilità note non fixabili (accettate)

| Pacchetto           | Versione            | CVE (High/Medium)                                                 | Motivo accettazione                                                                                                                                                                                                                  |
| ------------------- | ------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **PyJWT**           | 2.13.0 (ultima)     | 2 high, 2 medium (CVE-2026-32597, -48523, -48525, -48526)         | Già all'ultima versione disponibile. Fix attesi da upstream.                                                                                                                                                                         |
| **PostCSS**         | sub-dep Next.js     | 5 high, 2 medium (CVE-2026-41305, -45623, -69153, path traversal) | Sub-dipendenza interna di Next.js. Non fixabile separatamente.                                                                                                                                                                       |
| **sharp/libvips**   | sub-dep Next.js     | 1 high (CVE-2026-33327/28/35590)                                  | Sub-dipendenza interna di Next.js. Non fixabile separatamente.                                                                                                                                                                       |
| **brace-expansion** | sub-dep eslint      | 3 high (CVE-2026-13149, -14257, -69152)                           | DevDependency. Non in produzione.                                                                                                                                                                                                    |
| **js-yaml**         | sub-dep eslint      | 1 high (CVE-2026-59869)                                           | DevDependency. Non in produzione.                                                                                                                                                                                                    |
| **glib (Rust)**     | sub-dep Tauri       | 0 (1 medium)                                                      | Sub-dipendenza indiretta di Tauri. Forzare `glib 0.20.0` rischia di rompere `cargo tauri build`. CVE non esposto a input utente.                                                                                                     |
| **vitest**          | dev-dep web/desktop | 3 moderate (GHSA-82fw-gwwq-j7x9)                                  | DevDependency non esposta in produzione. Fix richiede upgrade major 4→5 con breaking changes (clearMocks default, vi.mock top-level, async assertion, coverage include/exclude). Costo sproporzionato per vuln moderate in dev tool. |

> **Totale:** 30 segnalazioni Dependabot. **16 risolte** (incluso bump Next.js 16.3.5 + js-yaml 4.3.2 via PR #781, starlette via PR #783), **18 accettate** come non fixabili o già all'ultima versione.
>
> **Audit 2026-09-12 (npm audit + pip-audit + cargo audit):** Web 3 vuln (3 moderate vitest, critical/high risolti con next 16.3.5). Desktop frontend **0 vuln**. Mobile 28 vuln (9 high, 19 moderate, 0 critical — quasi tutte in dev-deps jest/expo, non fixabili senza downgrade). Backend **0 vuln** (starlette fixato con fastapi 0.141.1, PR #783). Rust 8 warning (unmaintained/unsound, nessuna critical).

---

## 📝 Note operative

- I bug contrassegnati con **piano** hanno un file `.specs/plans/` corrispondente con dettagli e implementazione step-by-step.
- Questo file va aggiornato quando un bug viene fixato o quando se ne scopre uno nuovo.
- I fix risolti vanno spostati in `CHANGELOG.md`.
- Le **lezioni apprese** (QA, migrazioni, CSRF/CORS, security audit) sono in [`LESSONS_LEARNED.md`](./LESSONS_LEARNED.md).
