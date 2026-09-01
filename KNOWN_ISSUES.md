# Known Issues & Technical Debt

> **Scopo:** Tracciare bug minori, debito tecnico e miglioramenti che non hanno rilevanza architetturale (non vanno in `ADR.md`).  
> **Aggiornato:** 2026-08-23

---

## ✅ Risolte in questa sessione

| Issue | Fix                                              |
| ----- | ------------------------------------------------ |
| #667  | Keep-warm backend (GitHub Actions + frontend)    |
| #668  | Icona origine piattaforma per PDF                |
| #669  | Mobile: remember me con schermata di caricamento |
| #670  | Mobile: snackbar errore upload cloud             |
| #671  | Mobile: PDF in cartella PdfEditor/               |
| #672  | Mobile: fix cursore rename PDF                   |
| #673  | Desktop: cartella predefinita salvataggio PDF    |
| #689  | Desktop fixes batch (9 fix + i18n + test)        |

---

## 🔴 Bug aperti

### K6 — Disinstallazione non cancella dati utente in %APPDATA%

**File:** `desktop/src-tauri/installer.nsh`  
**Descrizione:** L'uninstall di NSIS cancella solo i file in `C:\Program Files\PdfEditor/`, non i dati utente in `%APPDATA%/PdfEditor/` (PDF, DB SQLite, secret.key). Reinstallando l'app, i vecchi PDF e utenti sono ancora presenti.

**Comportamento:** Voluto — è lo standard Windows (Chrome, Discord, Spotify fanno lo stesso). I dati utente sono separati dall'applicazione.

**Se in futuro si volesse cambiare:** Aggiungere una MessageBox in `NSIS_HOOK_PREUNINSTALL` che chiede "Vuoi cancellare anche i tuoi PDF e dati utente?" e, se confermato, cancella `%APPDATA%/PdfEditor/`.

**Stato:** Non pianificato.

### K5 — Auth offline: dopo login Google, l'app non funziona senza connessione

**File:** `shared/src/auth.tsx`, `shared/src/api.ts`  
**Descrizione:** Dopo login Google (online), se la connessione cade e il JWT scade (60 min), l'utente non può più usare l'app — neanche per i PDF locali. Manca il salvataggio del profilo utente + JWT in cache locale per uso offline.

**Soluzione prevista:**

1. Salvare profilo + JWT + refresh token in SQLite/AsyncStorage dopo login
2. Se offline e JWT scaduto → modalità offline (solo PDF locali)
3. Alla riconnessione → refresh automatico JWT + ripresa sync

**Stato:** Da verificare — l'utente non è sicuro se funzioni o meno.

### K4 — Settings: antialiasing/densità nessun effetto visibile

**File:** `desktop/frontend/src/app/settings/page.tsx`  
**Descrizione:** Il toggle antialiasing e il select densità non producono cambiamenti visibili nell'interfaccia. L'antialiasing agisce sul font rendering (`-webkit-font-smoothing` su body), ma la differenza è impercettibile con i font e colori usati. La densità modifica solo il padding degli elementi `.doc-item` (8/12/20px), ma la differenza è troppo sottile per essere notata.

**Stato:** ✅ Risolto — tecnicamente applicato ma nessun effetto visibile percepibile.

### K3 — Upload PDF 403 (CSRF validation failed) — DRAFT

**File:** `shared/src/auth.tsx`, `shared/src/api.ts`, `backend/app/core/csrf.py`  
**Descrizione:** L'upload PDF su sidecar dà 403 CSRF. Il cookie CSRF non viene inviato dal browser su POST cross-site (origin `http://tauri.localhost` → target `127.0.0.1:7723`) a causa di `SameSite=Lax`.

**Soluzione prevista:** Usare `SameSite=None, Secure=False` su localhost. Chrome/Edge permettono SameSite=None senza Secure su localhost.
**Stato:** ✅ Non più osservato dall'utente — fix implementato in `csrf.py`, da confermare con nuova build.

### K1 — Login con email/password non funziona su Neon (401)

**File:** `shared/src/auth.tsx`, `desktop/frontend/src/shared/auth.tsx`  
**Descrizione:** Il login chiama `cloudApi.login()` su `https://pdfeditor-api.mirkobechini.com/auth/login` ma risponde 401. Possibili cause: utente non registrato su Neon, o SECRET_KEY del cloud diversa da quella del sidecar.

**Soluzione prevista:** Verificare che Render backend sia attivo, che l'utente sia registrato su Neon, e differenziare l'errore (già implementato ma non verificato: EMAIL_NOT_FOUND vs WRONG_PASSWORD).

**Stato:** ✅ Risolto in PR #682 — login desktop prova sidecar locale prima, poi cloud con sync utente. Login usa `fetch` diretto invece di `_fetch` per evitare loop 401.

### K2 — Google OAuth popup non funziona in Tauri

**File:** `backend/app/api/v1/auth.py` (endpoint già implementati), `desktop/frontend/src/components/GoogleLoginButton.tsx`  
20:**Descrizione:** La popup JavaScript di Google One Tap non funziona in webview Tauri (richiede dominio pubblico). È stato implementato un redirect flow via browser di sistema con endpoint `/auth/google/desktop-login` e `/auth/google/desktop-callback`, ma il redirect URI su Google Cloud Console deve essere aggiornato a `https://pdfeditor-api.mirkobechini.com/auth/google/desktop-callback`.

**Stato:** ✅ Funzionante — redirect flow via browser di sistema implementato e verificato dall'utente.

---

## 🟡 Bug minori

### B2 — Find & Replace non funziona

**File:** `backend/app/api/v1/text.py`  
**Descrizione:** L'endpoint `POST /pdfs/{id}/replace-text` accetta `search + replace + occurrence` ma il risultato non è affidabile. PyMuPDF text search ha limitazioni con PDF complessi (font embedded, ligature, spaziature variabili).  
**Risoluzione prevista:** Sostituire con inline text editor (`.specs/plans/feature-inline-text-editor.md`).

---

## 🔵 Debito tecnico

### T1 — `_password_cache` module-global non scala

**File:** `backend/app/services/pdf_service.py`  
**Descrizione:** Variabile `_password_cache` è module-global. Con multi-worker (gunicorn), ogni worker ha la sua copia.  
**Risoluzione prevista:** Redis o DB centralizzato.

### T2 — Zero test E2E / integration

**Descrizione:** 359 test backend (con `TestClient` same-origin) + 897 test desktop (vitest) + 272 test mobile. Nessun test E2E che copra flussi cross-origin reali (cookie, CSRF, CORS).  
**Risoluzione prevista:** Playwright (T7).

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

| #      | Pacchetto                        | Severità  | Versione             | Stato                    | Note                                                                                                                     |
| ------ | -------------------------------- | --------- | -------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **51** | `nanoid` (mobile)                | 🔴 high   | < 3.3.18             | ✅ **Fixato (override)** | Sub-dipendenza di react-navigation + expo. Override in mobile/package.json a 3.3.18.                                     |
| **50** | `image-size` (mobile)            | 🔴 high   | <= 2.0.2             | ⛔ **Non fixabile**      | Sub-dipendenza di expo (metro). Nessun fix disponibile.                                                                  |
| **49** | `image-size` (mobile)            | 🔴 high   | <= 2.0.2             | ⛔ **Non fixabile**      | Stesso di #50.                                                                                                           |
| **48** | `uuid` (mobile)                  | 🟡 medium | < 7.0.3              | ⛔ **Non fixabile**      | Sub-dipendenza di xcode → expo-config-plugins. Saltare a 11.1.1 rompe breaking changes.                                  |
| **32** | `glib::VariantStrIter` (Rust)    | 🟡 medium | < 0.20.0             | ⏳ **Sconsigliato**      | Dipendenza indiretta di Tauri. Forzare glib 0.20.0 rischia di rompere cargo tauri build. CVE non esposto a input utente. |
| —      | `postcss` (path traversal)       | 🔴 high   | 8.4.31 (via Next.js) | ⛔ **Non fixabile**      | Sub-dipendenza interna di `next@16.3.0`. In attesa che Next.js aggiorni il suo sub-dep.                                  |
| —      | `sharp` / libvips                | 🔴 high   | < 0.35.0             | ✅ **Già a 0.35.3**      | Next.js 16.3.0 include sharp 0.35.3. Alert ancora aperto? Dismiss automatico.                                            |
| —      | `brace-expansion`                | 🔴 high   | 1.1.16 / 5.0.8       | ✅ **Falso positivo**    | DevDependency di eslint, non raggiungibile in produzione.                                                                |
| —      | `js-yaml`                        | 🔴 high   | 4.0.0 / 4.3.1        | ✅ **Falso positivo**    | DevDependency di eslint, non raggiungibile in produzione.                                                                |
| —      | `httpx` + `starlette.testclient` | —         | —                    | ⛔ **Non fixabile**      | `StarletteDeprecationWarning` — `httpx2` non esiste ancora.                                                              |

### Vulnerabilità risolte (non più segnalate da Dependabot)

| Pacchetto          | Fix                                                  |
| ------------------ | ---------------------------------------------------- |
| `js-yaml`          | PR #392 (bump 4.2.0 → 4.3.0)                         |
| `next`             | PR #393 (bump 16.2.9 → 16.2.11)                      |
| `next` (CVE-2026)  | **bump 16.2.11 → 16.3.0** (3 high, 5 medium risolte) |
| `python-multipart` | PR #395 (bump 0.0.31 → 0.0.32)                       |
| `PyJWT`            | Già a 2.13.0 (fixato)                                |
| `python-jose`      | Rimosso (non in uso)                                 |

### ⚠️ Vulnerabilità note non fixabili (accettate)

| Pacchetto           | Versione        | CVE (High/Medium)                                                 | Motivo accettazione                                                                                                              |
| ------------------- | --------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **PyJWT**           | 2.13.0 (ultima) | 2 high, 2 medium (CVE-2026-32597, -48523, -48525, -48526)         | Già all'ultima versione disponibile. Fix attesi da upstream.                                                                     |
| **PostCSS**         | sub-dep Next.js | 5 high, 2 medium (CVE-2026-41305, -45623, -69153, path traversal) | Sub-dipendenza interna di Next.js. Non fixabile separatamente.                                                                   |
| **sharp/libvips**   | sub-dep Next.js | 1 high (CVE-2026-33327/28/35590)                                  | Sub-dipendenza interna di Next.js. Non fixabile separatamente.                                                                   |
| **brace-expansion** | sub-dep eslint  | 3 high (CVE-2026-13149, -14257, -69152)                           | DevDependency. Non in produzione.                                                                                                |
| **js-yaml**         | sub-dep eslint  | 1 high (CVE-2026-59869)                                           | DevDependency. Non in produzione.                                                                                                |
| **glib (Rust)**     | sub-dep Tauri   | 0 (1 medium)                                                      | Sub-dipendenza indiretta di Tauri. Forzare `glib 0.20.0` rischia di rompere `cargo tauri build`. CVE non esposto a input utente. |

> **Totale:** 30 segnalazioni Dependabot. **12 risolte** (incluso bump Next.js 16.3.0), **18 accettate** come non fixabili o già all'ultima versione.

---

## 📝 Note operative

- I bug contrassegnati con **piano** hanno un file `.specs/plans/` corrispondente con dettagli e implementazione step-by-step.
- Questo file va aggiornato quando un bug viene fixato o quando se ne scopre uno nuovo.
- I fix risolti vanno spostati in `CHANGELOG.md`.
- Le **lezioni apprese** (QA, migrazioni, CSRF/CORS, security audit) sono in [`LESSONS_LEARNED.md`](./LESSONS_LEARNED.md).
