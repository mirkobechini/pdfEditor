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
- **Desktop:** Tauri v2 (futuro, Fase 1c) — sidecar con FastAPI bundle
- **Mobile:** React Native / Expo bare workflow (futuro, Fase 4)
- **Backend:** FastAPI (Python) — Auth, elaborazione PDF, cloud sync
- **PDF processing:** PyMuPDF (fitz) — modifica testo, merge/split, metadati
- **PDF viewer lato client:** PDF.js (Mozilla)
- **PDF manipulation lato client:** pdf-lib (per merge/split/riordino offline)
- **Database offline:** SQLite
- **Database cloud:** PostgreSQL (Neon)
- **File storage cloud:** Cloudflare R2
- **ORM:** SQLAlchemy 2.0
- **Auth:** JWT (bcrypt) + httpOnly cookie + SSO Google (PyJWT + requests)
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

| Scelta                                              | Alternativa implicita      | Motivo                                                                                                                                                                                                                                                                            |
| --------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js con `output: 'export'`                      | SSR/API Routes             | Compatibilità Tauri (static export), API tutte su FastAPI                                                                                                                                                                                                                         |
| UUID come PK                                        | autoincrement integer      | Sync bidirezionale SQLite ↔ PostgreSQL senza conflitti                                                                                                                                                                                                                            |
| PyMuPDF                                             | pdf-lib, pikepdf           | Supporto nativo modifica testo, metadati, tagging accessibilità                                                                                                                                                                                                                   |
| Autenticazione obbligatoria per ogni operazione PDF | Endpoint /pdfs/\* pubblici | Ogni PDF è associato a un utente (user_id). Anche le operazioni base (upload/list/download/delete) richiedono login, perché senza user_id non esiste ownership. Il free tier è un utente registrato a tutti gli effetti.                                                          |
| PyJWT + requests per SSO Google                     | Authlib, python-jose       | Scelta implementativa diretta: `import jwt` (PyJWT) invece di python-jose[cryptography]. Nessuna dipendenza extra.                                                                                                                                                                |
| Provider i18n custom → next-intl client-side        | next-intl con middleware   | next-intl già installato ma inutilizzato. Rifattorizzato in PR #94: NextIntlClientProvider client-side (compatibile con output: 'export').                                                                                                                                        |
| FastAPI sidecar con PyInstaller                     | Backend remoto sempre      | Funzionamento offline desktop (Fase 1c)                                                                                                                                                                                                                                           |
| pdf-lib lato client per merge/split                 | Solo API server            | Sostituito da API backend — refactoring PR #72                                                                                                                                                                                                                                    |
| Tagged PDF in output                                | PDF non strutturati        | Accessibilità screen reader (obbligo AGPL indiretto)                                                                                                                                                                                                                              |
| SendGrid API HTTP invece di SMTP                    | SMTP via libreria SendGrid | Render free tier blocca la porta 587 in uscita. Usata API HTTP v3 direttamente con `requests` — nessuna dipendenza extra.                                                                                                                                                         |
| Standard error codes API (codice + dettaglio)       | Solo `str(e)` plain        | Ogni HTTPException backend usa `error_response(code, detail)` con codice stabile (es. `INVALID_CREDENTIALS`). Il frontend mappa ogni codice in una chiave i18n tramite `mapError()`, eliminando `err.message` raw in UI. Motivo: UX produzione, supporto IT/EN, debug facilitato. |
| Neon PostgreSQL (serverless)                        | Render PostgreSQL free     | Render ha discontinuato il free tier PostgreSQL. Neon offre PostgreSQL serverless con free tier permanente (0.5GB storage, 100h compute/mese con auto-suspend). Connection pooling built-in, stesso driver psycopg.                                                               |
| Cloudflare R2 per storage PDF                       | Disco locale Render        | Già implementato in `s3_storage.py` + `storage.py`. Gratis 10GB storage, zero egress cost. Configurato con `STORAGE_BACKEND=s3`.                                                                                                                                                  |

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

- Desktop Tauri v2 (Fase 1c — futuro)
- Cloud sync bidirezionale (Fase 3 — futuro)
- Mobile React Native (Fase 4 — futuro)
- Integrazione pagamenti Stripe (pianificata — vedi `.specs/plans/feature-stripe-mcp-subscriptions.md`)
- SSO Apple / Samsung (previsto come bonus futuro)
- react-native-web (valutabile, non deciso)
- Annotazioni PDF (drawing, highlight, commenti — non menzionati)

## Bug tracker

> 📋 **Storico completo dei fix:** Vedi [`CHANGELOG.md`](./CHANGELOG.md) per l'elenco di tutte le PR e issue.

### Issue note ma non bloccanti ⏳

| #   | Issue                                                            | Impatto              | Risoluzione prevista                                  |
| --- | ---------------------------------------------------------------- | -------------------- | ----------------------------------------------------- |
| 2   | **`_password_cache` module-global** — non scala con multi-worker | Medio                | Redis o DB in Fase 2 (✅ B18: cleanup su shutdown)    |
| 14  | **Nessun integration/E2E test**                                  | Medio                | ⬜ Playwright futuro (T7)                             |
| 19  | **Find & Replace non funziona**                                  | Medio                | ⬜ Inline text editor (feature #11)                   |
| 21  | **Frontend coverage 70%** — 247 test su 50 file                  | ✅ Risolto (PR #233) | `.specs/plans/chore-frontend-100-percent-coverage.md` |

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
> **Rimedio:** Documentato il flusso: dopo il login il frontend deve effettuare almeno una GET autenticata (es. lista PDF) per ricevere `csrf_token` e rimandarlo via header `X-CSRF-Token` nei POST successivi. In caso contrario il primo upload fallisce.  
> **Regola per il futuro:** Ogni flusso che effettua POST cross-origin deve assicurarsi di aver ottenuto il cookie CSRF con una richiesta "safe" precedente oppure modificare il backend per emettere il cookie durante il login.

### ⚠️ Stato post-merge `dev -> main` (2026-07-21, merge `d84befd`)

Il merge massivo (145 commit) ha introdotto gran parte dell'infrastruttura di error handling standardizzato, ma non ha completato la migrazione in modo uniforme su tutti i file.

**Gap verificati nel codice (presenti anche nel merge `d84befd`):**

- Backend: eccezioni raw ancora presenti in `backend/app/api/v1/auth.py`, `backend/app/api/v1/convert.py`, `backend/app/api/v1/upload.py`
- Frontend: alcuni catch mostrano ancora `err.message` raw in `MetadataDialog`, `SplitDialog` (un ramo), `reset-password/page.tsx`

**Impatto:** UX incoerente (fallback `common.unknownError`), diagnosi più difficile, regressioni percepite anche quando il fix backend esiste.

### ✅ Checklist operativa di stabilizzazione (ordine consigliato)

1. **Backend hardening error codes**
   - Migrare tutte le `raise HTTPException(...)` residue nelle route a `error_response(...)`
   - Aggiungere `ErrorCode` mancanti solo dove necessario

2. **Frontend hardening mapError**
   - Eliminare i catch con `err.message` raw
   - Usare `mapError(err)` in tutti i flussi utente

3. **Contratto API errori (test)**
   - Aggiungere test backend che validano formato errori `{code, detail}` per endpoint critici
   - Aggiungere test frontend su mapping codici (`GOOGLE_AUTH_FAILED`, `UPLOAD_TOO_LARGE`, `VALIDATION_ERROR`)

4. **Smoke test post-merge prima di chiudere issue**
   - Login email/password
   - Google SSO fail path (messaggio localizzato corretto)
   - Upload/import fail path (messaggio localizzato corretto)

5. **E2E minimo cross-origin (Playwright, T7)**
   - Validare cookie httpOnly + `credentials: include` su dominio frontend/backend separato
   - Usare come gate per merge futuri su fix auth/error handling

**Regola operativa:** dopo ogni merge massivo su `main`, eseguire sempre smoke test funzionale sui 3 flussi critici (auth, upload, error rendering) prima di considerare il merge “stabile”.

**Piano operativo dedicato:** vedi `.specs/plans/hotfix-post-merge-d84befd-stabilization.md`.

**Aggiornamento stato (issue #374):** fixata la regressione i18n nella pagina admin bug reports (`admin.admin.*`), con mapping status allineato a `BUG_STATUS_KEYS` in `frontend/src/app/admin/page.tsx`.

### Security audit 2026-07-09

> 🔒 **Security audit completato — 20/24 issue risolte (83%).**  
> Tutte le vulnerabilità critiche e alte sono state corrette.  
> Vedi [`CHANGELOG.md`](./CHANGELOG.md) per l'elenco completo.

> **⚠️ Lezione appresa (2026-07-13) — Bug post-deploy su Render:**  
> 4 bug critici hanno superato 256 test perché i test non coprivano il flusso cross-origin reale.  
> **Rimedio:** Test riscritti per flusso cookie-based. Per i dettagli, vedi le regole in "Quality assurance" sotto.

> **⚠️ Lezione appresa (2026-07-15):** I bug vanno cercati nel codice, non aspettare che emergano in produzione.  
> Audit manuale ha trovato 21 bug + 10 miglioramenti, tutti fixati con PR e CI.

> **Nota tecnica:** Il warning `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated; install httpx2 instead` non è fixabile — `httpx2` non esiste ancora.

> **🔑 MCP Servers:** Stripe (OAuth), Render (`render-oss/render-mcp-server`), Railway (community).

## Quality assurance — test che non mentono

> **⚠️ Lezione appresa (2026-07-13): I test devono copiARE il flusso reale, non simularlo.**
>
> Bug critici sono arrivati in produzione nonostante 256 test passassero. Causa: i test mockavano/bypassavano il comportamento reale invece di testarlo.
>
> **Regole per test futuri:**
>
> 1. Il flusso cookie-based deve essere testato con cookie, non con Bearer header
> 2. CSRF/rate limiting non possono essere semplicemente disabilitati — vanno testati separatamente
> 3. I mock di librerie esterne (jwt.decode, Google certs) vanno verificati contro il comportamento reale
> 4. Ogni nuova feature deve includere test che simulano lo scenario di produzione (dominio diverso, cookie cross-origin, ecc.)
> 5. `TestClient` ha limitazioni intrinseche (stesso-origin) — i test E2E con Playwright sono necessari per la vera validazione cross-origin

## Coverage test backend

### Stato attuale: 97% (325 test, 0 failures, 0 warnings)

| Modulo                                                                                            | Coverage | Note                 |
| ------------------------------------------------------------------------------------------------- | -------- | -------------------- |
| `security.py`, `config.py`, `merge_split.py`, `metadata.py`, `reorder.py`, `text.py`, `unlock.py` | 100%     | ✅                   |
| `auth.py`, `csrf.py`, `storage.py`                                                                | 100%     | ✅                   |
| `models/*`, `repositories/*`, `email_service.py`                                                  | 100%     | ✅                   |
| `s3_storage.py`                                                                                   | 99%      | 1 linea (def)        |
| `auth_service.py`                                                                                 | 99%      | 1 linea Google login |
| `convert.py`                                                                                      | 98%      | 1 linea (def)        |
| `admin.py`                                                                                        | 97%      | 🟡                   |
| `pdf_merge_split_service.py`                                                                      | 97%      | 🟡                   |
| `database.py`, `user_repo.py`                                                                     | 95-98%   | 🟡                   |
| `main.py`                                                                                         | 87%      | 🟡 startup code      |
| `pdf_service.py`                                                                                  | 86%      | 🔴 error path        |
| **TOTALE**                                                                                        | **97%**  |                      |

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

### Fasi successive (macro)

Dopo il completamento delle feature pendenti della Fase 1, il progetto prosegue con le seguenti macro-fasi:

- ⬜ **Fase 1c — Desktop app (Tauri v2)** — Setup Tauri + Next.js build statica. PyInstaller per bundle FastAPI in eseguibile. Sidecar: avvio FastAPI locale all'avvio. SQLite locale per dati offline. Installer per Windows (primario), macOS/Linux (secondario).
- ✅ **Fase 2 — Web app su cloud** — Deploy FastAPI su Render. PostgreSQL cloud. Upload file su S3 (Cloudflare R2). Next.js static export. **[COMPLETATA]** — 2026-07-10.
- ⬜ **Fase 3 — Cloud sync** — Sync bidirezionale SQLite ↔ PostgreSQL (UUID + timestamp). Risoluzione conflitti (lock ottimistico). Modalità offline/online seamless.
- ⬜ **Fase 4 — Mobile app (React Native)** — Setup React Native (Expo bare workflow). Logica React condivisa (API client, hooks auth, utility PDF). UI nativa. Viewer PDF.js via WebView. SSO Google login. Store deployment (Google Play / Apple).

### Feature minori

> 📋 **Storico completo:** Vedi [`CHANGELOG.md`](./CHANGELOG.md)

## Architectural Guidance

### Q1: Nel database i dati sono protetti?

**Sì, i dati sono protetti a più livelli:**

1. **Autenticazione & Authorization**
   - Ogni utente deve autenticarsi via JWT (email/password) o Google OAuth
   - Token ha expiry di 60 minuti
   - Ogni endpoint richiede token valido; request senza token riceve 401 Unauthorized

2. **SQL Injection Prevention**
   - SQLAlchemy ORM con parameterized queries (zero risk)
   - Nessuna concatenazione di SQL, solo ORM methods (`query.filter()`, `query.get()`, ecc.)

3. **Password Hashing**
   - bcrypt con salt casuale (12 rounds)
   - Impossibile invertire hash → rainbow tables inutili
   - Field `password` in DB è sempre hash, mai plain text

4. **User Isolation**
   - Ogni PDF ha `user_id` (FK a User)
   - Ogni endpoint filtra `WHERE pdf.user_id = current_user.id`
   - Utente A non può accedere PDF di Utente B

5. **CORS Handling**
   - Backend specifica `ALLOWED_ORIGINS` (only frontend domain)
   - Richieste cross-origin non autorizzate ricevono 403 CORS Forbidden
   - Credentials sempre required

6. **Sensitive Data in Logs**
   - Password, token, email mai loggati in plain text
   - Environment variables per secrets (DATABASE_URL, JWT_SECRET_KEY, SENDGRID_API_KEY)

7. **HTTPS in Production**
   - Render auto-applica TLS su deployed URL
   - Cookies marcati HttpOnly, Secure, SameSite=Strict

**Cosa NON è implementato (futuro)**:

- Encryption at rest per database (PostgreSQL può avere TDE/encryption plugin)
- Rate limiting per login attempts (brute-force attack protection)
- Two-factor authentication (2FA)
- Audit log per accessi utente
- Field-level encryption per dati sensibili

---

### Q2: SendGrid ha un massimo di mail, si può gestire? Quale strategia consigliata?

**Sì, SendGrid free tier ha limite ~100 email/mese. Strategia consigliata:**

1. **Rilevamento limite raggiunto**
   - Backend catchesHTTP 429 (Too Many Requests) da SendGrid API
   - Al limite → endpoint risponde con 429 al client
   - Frontend mostra messaggio: "Monthly email limit reached. Try again next month."
   - Bottone "Send Reset Email" disabilitato con tooltip

2. **User Experience**
   - Toast notification top-right: "⚠️ Email limit reached this month. Please try again next month."
   - Bottone diventa gray + cursor:not-allowed
   - Messaggio consigliato: "Admin can manually send reset email if urgent"

3. **Admin Fallback**
   - Admin dashboard (`/admin`) consente inviare reset email manualmente senza quota
   - Endpoint `POST /admin/users/{user_id}/send-reset-email` ignora limiti SendGrid
   - Utile per support team se utente ha emergenza

4. **Monitoring & Alerts**
   - Log ogni tentativo di invio al limite
   - (Futuro) Dashboard admin mostra quota email corrente
   - (Futuro) Alert email quando 80% quota raggiunta

5. **Upgrade Path (Future)**
   - Messaggio: "Reach email limit frequently? Upgrade account for unlimited emails"
   - Link a checkout Stripe/Lemon Squeezy con tier "Pro" (unlimited emails)

**Implementazione**:

- Vedi piano dettagliato: `.specs/plans/feature-sendgrid-rate-limit-handling.md`
- Backend: `EmailService.send_password_reset_email()` torna `{"success": false, "error": "rate_limit_exceeded"}`
- Frontend: Catch 429 status code e mostra alert

---

### Recommendation Summary

| Concern               | Status       | Strategy                                                |
| --------------------- | ------------ | ------------------------------------------------------- |
| Data protection in DB | ✅ Protected | JWT + ORM + bcrypt + user_id filtering                  |
| SQL injection         | ✅ Protected | SQLAlchemy parameterized queries                        |
| Password storage      | ✅ Protected | bcrypt hashing, never plain text                        |
| Cross-origin attacks  | ✅ Protected | CORS + ALLOWED_ORIGINS                                  |
| Email rate limit      | ✅ Protected | Catch 429, disable button, admin override               |
| Encryption at rest    | ❌ Future    | PostgreSQL encryption plugin (Phase 3+)                 |
| Rate limit login      | ✅ Protected | slowapi: 5/min login, 3/h register, 3/h forgot-password |
| 2FA support           | ❌ Future    | Low priority, evaluable in Phase 3+                     |

## 📋 Stato attuale (2026-07-20)

### ✅ Completati — 21 bug + 10 miglioramenti + 3 coverage sprint + error handling

| Categoria               | Quantità | PR                                                                              |
| ----------------------- | -------- | ------------------------------------------------------------------------------- |
| B1-B5 (critici)         | 5 bug    | #288, #290, #292, #294, #296                                                    |
| B6-B14 (alti)           | 9 bug    | #298, #300, #302, #304, #306, #308, #310, #312, #314                            |
| B15-B21 (medi)          | 7 bug    | #316, #318, #320, #322, #324, #326, #328                                        |
| R1-R10 (miglioramenti)  | 10 tasks | #330, #332, #334, #336, #338, #341, #343, #345                                  |
| Coverage backend        | 92→97%   | #357, #359, #361                                                                |
| Coverage frontend       | 68→76%   | #363, #364, #365                                                                |
| Error handling infra    | #366     | errors.py, error-map.ts, i18n keys                                              |
| Error handling frontend | #367     | 14 file catch block migrati a mapError()                                        |
| Error handling backend  | #368     | deps, admin, upload, convert migrati a error_response()                         |
| Error handling backend  | #369     | merge_split, reorder, metadata, text, unlock, undo_redo, bug_report, admin page |

### 🟡 MEDIA (feature)

| #   | Task                         | Piano                                     |
| --- | ---------------------------- | ----------------------------------------- |
| 1   | SendGrid rate limit handling | `feature-sendgrid-rate-limit-handling.md` |
| 2   | PDF compression              | `feature-pdf-compression.md`              |
| 3   | PDF naming preservation      | `feature-pdf-naming-preservation.md`      |
| 4   | UI/UX improvements           | `feature-ui-ux-improvements.md`           |
| 5   | Inline text editor           | `feature-inline-text-editor.md`           |
| 6   | Conferma email account       | `feature-email-confirmation.md`           |

#### 🔵 BASSA / Future

| #   | Task                                  | Piano                                              |
| --- | ------------------------------------- | -------------------------------------------------- |
| 7   | Stripe MCP Subscriptions              | `.specs/plans/feature-stripe-mcp-subscriptions.md` |
| 8   | AI PDF editing                        | `.specs/plans/feature-ai-pdf-editing.md`           |
| 9   | E2E Playwright tests                  | `.specs/plans/chore-security-improvements.md`      |
| 10  | Tauri v2 Desktop (Fase 1c)            | —                                                  |
| 11  | Cloud sync SQLite↔PostgreSQL (Fase 3) | —                                                  |
| 12  | Mobile React Native (Fase 4)          | —                                                  |

### Test coverage (limite raggiunto)

| Area                      | Coverage | Note                                                      |
| ------------------------- | -------- | --------------------------------------------------------- |
| Backend                   | **97%**  | Limite pratico raggiunto (fitz, startup code, PostgreSQL) |
| Frontend unit test        | **76%**  | Limite pratico raggiunto (PDF.js canvas, dynamic import)  |
| Frontend E2E (Playwright) | **0%**   | Necessario per superare l'80% — T7                        |
