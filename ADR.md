# Architecture Decision Record

**Progetto:** PdfEditor
**Data:** 2026-06-25
**Autore:** Mirko Bechini

## Decisione

Applicazione cross-platform per la modifica e gestione di file PDF, con funzionalità di visualizzazione, annotazione, conversione, modifica testo e manipolazione avanzata. Architettura modulare che copre web (Next.js), desktop (Tauri v2), mobile (React Native) e backend (FastAPI).

## Contesto

Creare un'applicazione PDF editor che funzioni offline come priorità (desktop), con estensione al web e successivamente al mobile. L'utente target è un utente tecnico che necessita di editing PDF avanzato senza dipendere da servizi cloud a pagamento. Il progetto è open source (licenza AGPL compatibile per PyMuPDF).

## Piattaforme scelte

- **Frontend:** React 19 + TailwindCSS v4 — UI condivisa tra web, desktop e mobile
- **Framework web:** Next.js 16 (app router) con `output: 'export'` per compatibilità Tauri
- **Desktop:** Tauri v2 (Fase 1c) — sidecar con FastAPI bundle (PyInstaller)
- **Desktop cartella:** `desktop/` — codice dedicato Tauri (Rust, sidecar, icons, updater)
- **Mobile:** React Native / Expo bare workflow (futuro, Fase 4)
- **Backend:** FastAPI (Python) — Auth, elaborazione PDF, cloud sync
- **PDF processing:** PyMuPDF (fitz) — modifica testo, merge/split, metadati
- **PDF viewer lato client:** PDF.js (Mozilla)
- **Database offline:** SQLite
- **Database cloud:** PostgreSQL (Neon)
- **File storage cloud:** Cloudflare R2
- **ORM:** SQLAlchemy 2.0
- **Auth:** JWT (bcrypt) + httpOnly cookie + SSO Google (google-auth-library)
- **i18n:** next-intl (dichiarato, ma attualmente implementato con provider custom)
- **Migration:** Alembic
- **Email:** SendGrid v3 Mail Send API (HTTP) — `requests` diretto, no libreria SendGrid SDK
- **Test backend:** pytest
- **Test frontend:** vitest + jsdom + @testing-library/react

## Componenti principali

- **Visualizzazione PDF** — Viewer PDF.js integrato in React, con zoom, navigazione pagine e anteprime
- **Sidebar** — Elenco PDF caricati con upload, download, elimina e rinomina
- **Toolbar** — Barra strumenti superiore con navigazione pagine, zoom, azioni (annotazione, modifica, conversione)
- **Backend API (FastAPI)** — Endpoint REST per upload/download, merge/split, riordino, rimozione pagine, modifica testo, metadati, conversione formato, autenticazione JWT + SSO Google
- **Autenticazione** — JWT email/password + SSO Google. Modelli User con license_tier
- **Licensing** — Modelli LicenseFeature per blocco feature per tier (free/premium/lifetime/admin)
- **Bug reporting** — Modello BugReport API per segnalazioni dall'interfaccia
- **Conversione formati** — PDF ↔ DOCX/XLSX/PNG/JPG/TXT/SVG tramite PyMuPDF + librerie ausiliarie
- **Dashboard admin** — Gestione utenti, licenze e bug report

## Decisioni architetturali

| Scelta                                              | Alternativa implicita       | Motivo                                                                                                                                                                                                                                                                            |
| --------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js con `output: 'export'`                      | SSR/API Routes              | Compatibilità Tauri (static export), API tutte su FastAPI                                                                                                                                                                                                                         |
| UUID come PK                                        | autoincrement integer       | Sync bidirezionale SQLite ↔ PostgreSQL senza conflitti                                                                                                                                                                                                                            |
| PyMuPDF                                             | pdf-lib, pikepdf            | Supporto nativo modifica testo, metadati, tagging accessibilità                                                                                                                                                                                                                   |
| Autenticazione obbligatoria per ogni operazione PDF | Endpoint /pdfs/\* pubblici  | Ogni PDF è associato a un utente (user_id). Anche le operazioni base (upload/list/download/delete) richiedono login, perché senza user_id non esiste ownership. Il free tier è un utente registrato a tutti gli effetti.                                                          |
| google-auth-library per SSO Google                  | PyJWT + requests manuali    | google-auth ufficiale: cache automatica chiavi, validazione Google, key rotation gestita. PR #388.                                                                                                                                                                                |
| Provider i18n custom → next-intl client-side        | next-intl con middleware    | next-intl già installato ma inutilizzato. Rifattorizzato in PR #94: NextIntlClientProvider client-side (compatibile con output: 'export').                                                                                                                                        |
| FastAPI sidecar con PyInstaller                     | Backend remoto sempre       | Funzionamento offline desktop (Fase 1c)                                                                                                                                                                                                                                           |
| API backend per merge/split/riordino                | pdf-lib lato client         | pdf-lib sostituito da API backend per affidabilità — refactoring PR #72. PyMuPDF server-side.                                                                                                                                                                                     |
| Tagged PDF in output                                | PDF non strutturati         | Accessibilità screen reader (obbligo AGPL indiretto)                                                                                                                                                                                                                              |
| SendGrid API HTTP invece di SMTP                    | SMTP via libreria SendGrid  | Render free tier blocca la porta 587 in uscita. Usata API HTTP v3 direttamente con `requests` — nessuna dipendenza extra.                                                                                                                                                         |
| Standard error codes API (codice + dettaglio)       | Solo `str(e)` plain         | Ogni HTTPException backend usa `error_response(code, detail)` con codice stabile (es. `INVALID_CREDENTIALS`). Il frontend mappa ogni codice in una chiave i18n tramite `mapError()`, eliminando `err.message` raw in UI. Motivo: UX produzione, supporto IT/EN, debug facilitato. |
| Neon PostgreSQL (serverless)                        | Render PostgreSQL free      | Render ha discontinuato il free tier PostgreSQL. Neon offre PostgreSQL serverless con free tier permanente (0.5GB storage, 100h compute/mese con auto-suspend). Connection pooling built-in, stesso driver psycopg.                                                               |
| Cloudflare R2 per storage PDF                       | Disco locale Render         | Già implementato in `s3_storage.py` + `storage.py`. Gratis 10GB storage, zero egress cost. Configurato con `STORAGE_BACKEND=s3`.                                                                                                                                                  |
| **Desktop: stessa UI del web**                      | UI desktop nativa           | `output: 'export'` già configurato; webview Tauri carica gli stessi asset statici. Si adattano solo API calls (da Render a localhost) e si aggiungono Tauri API per file dialogs nativi.                                                                                          |
| **Desktop: auth offline via Tauri safeStorage**     | Solo online                 | JWT cached in keychain OS (safeStorage). App funzionante offline con sync quando torna online.                                                                                                                                                                                    |
| **Desktop: cloud sync (Fase 3) integrata**          | Sync posticipato            | UUID PK già implementati. La Fase 3 viene integrata direttamente nella Desktop App: endpoint sync backend + UI sync frontend.                                                                                                                                                     |
| **Desktop: auto-update via GitHub Releases**        | Download manuale            | Tauri updater built-in: controlla GitHub Releases, scarica e installa in automatico.                                                                                                                                                                                              |
| **Desktop: PyMuPDF con PyInstaller**                | pdf-lib JS, embedded Python | Si tenta PyInstaller con `--hidden-import=fitz`. Fallback: embedded Python (embeddable zip) se i binding C danno problemi.                                                                                                                                                        |
| **Desktop: cartella `desktop/` dedicata**           | Nella root                  | Separazione netta: `backend/`, `frontend/`, `desktop/`. Il codice Tauri (Rust, sidecar, icons, updater) risiede in `desktop/src-tauri/`.                                                                                                                                          |

## Vincoli

- Licenza AGPL PyMuDVD — compatibile con open source. Se futuro closed source, necessaria licenza commerciale o alternativa
- Next.js in static export (no API routes, no SSR) per compatibilità Tauri
- UUID come PK in ogni tabella (sync bidirezionale futuro)
- `updated_at` timestamp su ogni record
- Ogni funzione atomica richiede test pytest/vitest prima di essere considerata completa
- Le feature partono solo dopo approvazione esplicita dell'utente (roadmap a fasi)
- Max 10 snapshot undo/redo per sessione (configurabile via MAX_SNAPSHOTS in .env)
- Dark mode con persistenza (localStorage + system preference fallback)
- `ALLOWED_EXTENSIONS` in `.env` come stringa (non lista) — parsato via `allowed_extensions_list` property
- Warning `httpx2` nei test non fixabile (dipende da starlette/fastapi)

## Cosa NON è in scope (per ora)

- Mobile React Native (Fase 4 — futuro)
- Integrazione pagamenti Stripe (pianificata — vedi `.specs/plans/feature-stripe-mcp-subscriptions.md`)
- SSO Apple / Samsung (previsto come bonus futuro)
- react-native-web (valutabile, non deciso)
- **Annotazioni PDF** (drawing, highlight, commenti) — non implementate

## Bug tracker

> 📋 **Storico completo dei fix:** Vedi [`CHANGELOG.md`](./CHANGELOG.md) per l'elenco di tutte le PR e issue.

### 🔴 Known test failures (pre-esistenti, non bloccanti) — ✅ RISOLTI

I 4 test in `tests/test_edge_cases.py` che fallivano in locale per `channel_binding` sono stati risolti aggiornando `psycopg-binary` all'ultima versione. Ora 331/331 test passano in locale.

### Issue note ma non bloccanti ⏳

| #   | Issue                                                            | Impatto | Risoluzione prevista                               |
| --- | ---------------------------------------------------------------- | ------- | -------------------------------------------------- |
| 2   | **`_password_cache` module-global** — non scala con multi-worker | Medio   | Redis o DB in Fase 2 (✅ B18: cleanup su shutdown) |
| 14  | **Nessun integration/E2E test**                                  | Medio   | ⬜ Playwright futuro (T7)                          |
| 19  | **Find & Replace non funziona**                                  | Medio   | ⬜ Inline text editor (feature #11)                |

## Migrazioni infrastrutturali

### 2026-07-21 — Migrazione Database: Render PostgreSQL → Neon

**Motivazione:** Render ha discontinuato il free tier PostgreSQL. Il database sarebbe stato cancellato.

**Decisione:**

| Componente          | Prima                                 | Dopo                                     | Costo                                     |
| ------------------- | ------------------------------------- | ---------------------------------------- | ----------------------------------------- |
| Database PostgreSQL | Render PostgreSQL (free, in chiusura) | Neon (neon.tech) — serverless PostgreSQL | Gratis (0.5GB storage, 100h compute/mese) |
| File storage PDF    | Cloudflare R2                         | Cloudflare R2 (confermato, già attivo)   | Gratis (10GB)                             |

**Vantaggi Neon:**

- Free tier **senza expiry** (non come Render che ha chiuso)
- Auto-suspend dopo 5 minuti di inattività → consumo ore reale molto basso
- Connection pooling built-in (PgBouncer integrato)
- Compatibile con SQLAlchemy 2.0 + psycopg v3 (stesso stack già in uso)
- Branching del database per preview/development
- Si connette da Render senza problemi

**Dettaglio consumo compute ore:**

- Sempre attivo 24/7: 720h/mese ❌
- Uso normale (qualche richiesta/giorno): ~5-10h/mese ✅
- Uso intenso (decine di richieste/ora): ~30-50h/mese ✅

In caso di superamento, Neon sospende il database (non cancella i dati) fino al mese successivo.

**Per i dettagli operativi, vedi:** [`MIGRAZIONE_NEON.md`](./MIGRAZIONE_NEON.md)

**Nota tecnica:** Render free tier non genera backup esportabili. L'import è stato eseguito tramite Neon Import Wizard con connessione diretta al database Render (connection string). I dati sono finiti in una branch `import-...` separata, poi impostata come default.

> **⚠️ Lezione appresa (2026-07-21) — Schema DB incompleto dopo migrazione:**  
> L'import dei dati da Render PostgreSQL a Neon ha copiato i dati ma non lo schema completo. La colonna `bug_reports.report_count` era definita solo nel modello Python, non in una migrazione Alembic. Su Render funzionava perché il database era stato modificato manualmente. Su Neon, tutte le operazioni che accedevano a `bug_reports` fallivano con `UndefinedColumn`, causando una cascata di errori (Google SSO, upload, admin bug report, ecc.).
>
> **Rimedio:** Creata migrazione Alembic `6b1f5a3e8c9d` per aggiungere `report_count` a `bug_reports`.  
> **Regola per il futuro:** Ogni colonna nel modello DEVE avere una migrazione Alembic corrispondente. `_add_missing_columns()` in `main.py` è un workaround, non una soluzione — le migrazioni sono l'unico source of truth per lo schema.

> **⚠️ Lezione appresa (2026-07-21) — Google SSO usava HTTPException raw invece di error_response:**  
> Il `google_login()` in `auth.py` usava `HTTPException(status_code=401, detail=str(e))` invece di `error_response(ErrorCode.GOOGLE_AUTH_FAILED, ...)`. Il frontend non trovava un codice mappabile e mostrava `common.unknownError` invece di `auth.googleAuthFailed`.
>
> **Rimedio:** Sostituita raw HTTPException con `error_response()` nel google_login handler (PR #373, issue #372).  
> **Regola per il futuro:** Ogni endpoint DEVE usare `error_response()` con un codice `ErrorCode` stabile — mai `HTTPException` raw.

> **⚠️ Lezione appresa (2026-07-21) — Upload cross-origin blocca senza handshake CSRF iniziale:**  
> Il middleware `CSRFMiddleware` imposta il cookie `csrf_token` solo dopo una richiesta "safe" (GET/HEAD/OPTIONS). Se l'utente esegue il primo POST (upload) subito dopo il login, la richiesta viene respinta con `403` e il browser la segnala come errore CORS perché gli header sono generati prima del middleware CORS.
>
> **Fix 1 (hotfix #376):** Il cookie `csrf_token` viene ora emesso contestualmente al login/register/google tramite `set_csrf_cookie(response)` in `auth.py`. Il frontend non necessita più di una GET preliminare — il primo POST dopo login funziona immediatamente.
> **Fix 2 (hotfix #381):** Il `csrf_token` viene ora restituito anche nel **body della risposta** di login/register/google (campo `csrf_token` in `TokenResponse`). Il frontend lo memorizza in memoria nell'`ApiClient` perché `document.cookie` non è leggibile cross-origin (dominio API ≠ dominio frontend).
> **Regola per il futuro:** Ogni flusso cross-origin che usa CSRF double-submit pattern deve prevedere un meccanismo per trasmettere il token al frontend via body della risposta, non solo via cookie.
>
> **⚠️ Lezione appresa (2026-07-21) — Ordine middleware CSRF/CORS in Starlette:**
> In Starlette, l'**ultimo** middleware registrato con `add_middleware()` è il **più esterno** (quello che avvolge tutti gli altri). Se CSRFMiddleware è registrato dopo CORSMiddleware, le risposte 403 del CSRF bypassano il CORS e il browser le vede come errori CORS.
>
> **Fix (PR #380):** CORSMiddleware ora è l'ultimo middleware registrato (outermost), CSRFMiddleware è registrato prima (inner). La risposta 403 del CSRF risale attraverso CORSMiddleware che aggiunge `Access-Control-Allow-Origin`.
> **Regola per il futuro:** `add_middleware(CORSMiddleware)` deve essere SEMPRE l'ultimo middleware registrato nell'app FastAPI, per intercettare tutte le risposte (inclusi errori da middleware interni).

### Security audit 2026-07-09

> 🔒 **Security audit completato — 20/24 issue risolte (83%).**  
> Tutte le vulnerabilità critiche e alte sono state corrette.  
> Vedi [`CHANGELOG.md`](./CHANGELOG.md) per l'elenco completo.

> **⚠️ Lezione appresa (2026-07-15):** I bug vanno cercati nel codice, non aspettare che emergano in produzione.  
> Audit manuale ha trovato 21 bug + 10 miglioramenti, tutti fixati con PR e CI.

> **Nota tecnica:** Il warning `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated; install httpx2 instead` non è fixabile — `httpx2` non esiste ancora.

> **🔑 MCP Servers:** Stripe (OAuth), Render (`render-oss/render-mcp-server`), Railway (community).

## Quality assurance — test che non mentono

> **⚠️ Lezione appresa (2026-07-13): I test devono copiare il flusso reale, non simularlo.**
>
> 4 bug critici sono arrivati in produzione nonostante 256 test passassero. Causa: i test mockavano/bypassavano il comportamento reale invece di testarlo.
>
> **Regole per test futuri:**
>
> 1. Il flusso cookie-based deve essere testato con cookie, non con Bearer header
> 2. CSRF/rate limiting non possono essere semplicemente disabilitati — vanno testati separatamente
> 3. I mock di librerie esterne (jwt.decode, Google certs) vanno verificati contro il comportamento reale
> 4. Ogni nuova feature deve includere test che simulano lo scenario di produzione (dominio diverso, cookie cross-origin, ecc.)
> 5. `TestClient` ha limitazioni intrinseche (stesso-origin) — i test E2E con Playwright sono necessari per la vera validazione cross-origin

## Coverage test backend

### Stato attuale: 96% (331 test, 0 failures, 0 warnings)

| Modulo                                                                                            | Coverage | Note            |
| ------------------------------------------------------------------------------------------------- | -------- | --------------- |
| `security.py`, `config.py`, `merge_split.py`, `metadata.py`, `reorder.py`, `text.py`, `unlock.py` | 100%     | ✅              |
| `auth.py`, `csrf.py`, `storage.py`                                                                | 97-100%  | ✅              |
| `models/*`, `repositories/*`, `email_service.py`                                                  | 100%     | ✅              |
| `s3_storage.py`                                                                                   | 99%      | 1 linea (def)   |
| `auth_service.py`                                                                                 | 100%     | ✅              |
| `convert.py`                                                                                      | 98%      | 1 linea (def)   |
| `admin.py`                                                                                        | 97%      | 🟡              |
| `pdf_merge_split_service.py`                                                                      | 97%      | 🟡              |
| `database.py`                                                                                     | 95%      | 🟡              |
| `user_repo.py`                                                                                    | 100%     | ✅              |
| `main.py`                                                                                         | 87%      | 🟡 startup code |
| `pdf_service.py`                                                                                  | 86%      | 🔴 error path   |
| **TOTALE**                                                                                        | **96%**  |                 |

### Cosa manca per il 100% — limite raggiunto senza integration tests

Le rimanenti ~79 linee non coperte sono suddivise in tre categorie, nessuna delle quali è testabile con i soli unit test:

1. **pdf_service.py (45 linee)** — Richiedono mocking di PyMuPDF (fitz), una libreria C che non può essere mockata via unittest. I path non coperti includono: errori "file not found", undo/redo dopo snapshot, branch SVG/image export, branch image import.

2. **main.py (19 linee)** — Startup code che esegue solo in produzione: `_add_missing_columns` (ALTER TABLE), `_seed_super_admin`, `_seed_license_features` con DB reale.

3. **Infrastructure-dependent (~15 linee)** — PostgreSQL engine config (database.py), S3 pruning (s3_storage.py), `def` line (coverage artifact).

**Decisione architetturale:** Il 97% è il limite pratico per questo progetto senza dedicare risorse a test di integrazione con PostgreSQL e S3.

## Coverage test frontend

### Stato attuale: 75.9% (348 test, 50 files, 0 failures)

| Modulo                     | Coverage | Test                      |
| -------------------------- | -------- | ------------------------- |
| `login/page.tsx`           | 100%     | ✅                        |
| `register/page.tsx`        | 100%     | ✅                        |
| `Toolbar.tsx`              | 100%     | ✅                        |
| `MergeDialog.tsx`          | 100%     | ✅                        |
| 8 pagine statiche          | 100%     | ✅                        |
| `landing/*` components     | 100%     | ✅                        |
| `ProtectDialog.tsx`        | 97%      | ✅                        |
| `ReplaceTextDialog`        | 96%      | ✅                        |
| `GoogleLoginButton`        | 96%      | 🟡 1 linea dynamic import |
| `profile/page.tsx`         | 97%      | ✅                        |
| `PdfThumbnail.tsx`         | 96%      | ✅                        |
| `forgot-password/page.tsx` | 95%      | ✅                        |
| `reset-password/page.tsx`  | 97%      | ✅                        |
| `auth.tsx`                 | 97%      | 🟡                        |
| `DeleteModal.tsx`          | 93%      | ✅                        |
| `BugReportDialog`          | 93%      | 🟡                        |
| `AppLayout.tsx`            | 92%      | ✅                        |
| `PdfViewer.tsx`            | 87%      | ✅ (mock PDF.js)          |
| `HeaderControls`           | 88%      | 🟡                        |
| `Sidebar.tsx`              | 81%      | 🟡                        |
| `Toolbar` (branches)       | 100%     | ✅                        |
| `admin/page.tsx`           | 67%      | 🔴                        |
| `app/page.tsx` (editor)    | 69%      | 🟡 (mock)                 |
| `ReorderDialog`            | 34%      | 🔴 PDF.js thumbnails      |
| `SplitDialog`              | 38%      | 🔴 PDF.js thumbnails      |
| `RemoveDialog`             | 44%      | 🔴 PDF.js thumbnails      |
| `MetadataDialog`           | 64%      | 🔴                        |
| **Backend**                | **97%**  |                           |

### Cosa manca per il 100%

**Copribile con test esistenti:**

- Admin page (67% → 70%) — handleSaveLicense, handleSendReset, date filters
- Editor page (69% → 72%) — handleSplit, handleReorder, handleRemove, handleMetadata functions
- MetadataDialog (64% → 75%) — API calls, form state

**Non copribile (coverage artifact / infrastruttura):**

- ReorderDialog, SplitDialog, RemoveDialog (30-44%) — richiedono rendering PDF.js (canvas) in jsdom
- GoogleLoginButton linea 25 — catch dynamic import non mockabile
- JSX props in editor page — coverage artifact
- `def` line in vari file — coverage artifact

**Per superare l'80% servono test E2E con Playwright (T7).**

### Obiettivo: 80%+ (con Playwright) — 76% (solo unit test, limite raggiunto)

## Roadmap

### Fasi successive (macro)

| Fase                                   | Descrizione                                                                                                                                                                                                             | Stato                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **Fase 1c — Desktop app (Tauri v2)**   | Setup Tauri + Next.js build statica. PyInstaller per bundle FastAPI in eseguibile. Sidecar: avvio FastAPI locale all'avvio. SQLite locale per dati offline. Installer per Windows (primario), macOS/Linux (secondario). | ⬜ Futuro                  |
| **Fase 2 — Web app su cloud**          | Deploy FastAPI su Render. PostgreSQL cloud. Upload file su S3 (Cloudflare R2). Next.js static export.                                                                                                                   | ✅ Completata (2026-07-10) |
| **Fase 3 — Cloud sync**                | Sync bidirezionale SQLite ↔ PostgreSQL (UUID + timestamp). Risoluzione conflitti (lock ottimistico). Modalità offline/online seamless.                                                                                  | ⬜ Futuro                  |
| **Fase 4 — Mobile app (React Native)** | Setup React Native (Expo bare workflow). Logica React condivisa (API client, hooks auth, utility PDF). UI nativa. Viewer PDF.js via WebView. SSO Google login. Store deployment (Google Play / Apple).                  | ⬜ Futuro                  |

### Feature short-term

| Priorità | Task                         | Piano                                              |
| -------- | ---------------------------- | -------------------------------------------------- |
| 🟡 MEDIA | SendGrid rate limit handling | `feature-sendgrid-rate-limit-handling.md`          |
| 🟡 MEDIA | PDF compression              | `feature-pdf-compression.md`                       |
| 🟡 MEDIA | PDF naming preservation      | `feature-pdf-naming-preservation.md`               |
| 🟡 MEDIA | UI/UX improvements           | `feature-ui-ux-improvements.md`                    |
| 🟡 MEDIA | Inline text editor           | `feature-inline-text-editor.md`                    |
| 🟡 MEDIA | Conferma email account       | `feature-email-confirmation.md`                    |
| BASSA    | Stripe MCP Subscriptions     | `.specs/plans/feature-stripe-mcp-subscriptions.md` |
| 🔵 BASSA | AI PDF editing               | `.specs/plans/feature-ai-pdf-editing.md`           |
| 🔵 BASSA | E2E Playwright tests         | `.specs/plans/chore-security-improvements.md`      |
