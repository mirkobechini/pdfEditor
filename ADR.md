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
- **Database cloud:** PostgreSQL (Render)
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

| Scelta                                              | Alternativa implicita      | Motivo                                                                                                                                                                                                                   |
| --------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Next.js con `output: 'export'`                      | SSR/API Routes             | Compatibilità Tauri (static export), API tutte su FastAPI                                                                                                                                                                |
| UUID come PK                                        | autoincrement integer      | Sync bidirezionale SQLite ↔ PostgreSQL senza conflitti                                                                                                                                                                   |
| PyMuPDF                                             | pdf-lib, pikepdf           | Supporto nativo modifica testo, metadati, tagging accessibilità                                                                                                                                                          |
| Autenticazione obbligatoria per ogni operazione PDF | Endpoint /pdfs/\* pubblici | Ogni PDF è associato a un utente (user_id). Anche le operazioni base (upload/list/download/delete) richiedono login, perché senza user_id non esiste ownership. Il free tier è un utente registrato a tutti gli effetti. |
| python-jose[cryptography] + requests per SSO Google | Authlib                    | Scelta implementativa che si discosta dallo stack dichiarato                                                                                                                                                             |
| Provider i18n custom → next-intl client-side        | next-intl con middleware   | next-intl già installato ma inutilizzato. Rifattorizzato in PR #94: NextIntlClientProvider client-side (compatibile con output: 'export').                                                                               |
| FastAPI sidecar con PyInstaller                     | Backend remoto sempre      | Funzionamento offline desktop (Fase 1c)                                                                                                                                                                                  |
| pdf-lib lato client per merge/split                 | Solo API server            | Sostituito da API backend — refactoring PR #72                                                                                                                                                                           |
| Tagged PDF in output                                | PDF non strutturati        | Accessibilità screen reader (obbligo AGPL indiretto)                                                                                                                                                                     |
| SendGrid API HTTP invece di SMTP                    | SMTP via libreria SendGrid | Render free tier blocca la porta 587 in uscita. Usata API HTTP v3 direttamente con `requests` — nessuna dipendenza extra.                                                                                                |

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
- Deploy cloud / PostgreSQL (Fase 2 — già completata)
- Cloud sync bidirezionale (Fase 3 — futuro)
- Mobile React Native (Fase 4 — futuro)
- Integrazione pagamenti Stripe (pianificata — vedi `.specs/plans/feature-stripe-mcp-subscriptions.md`)
- SSO Apple / Samsung (previsto come bonus futuro)
- react-native-web (valutabile, non deciso)
- Annotazioni PDF (drawing, highlight, commenti — non menzionati)

## Bug tracker

> 📋 **Storico completo dei fix:** Vedi [`CHANGELOG.md`](./CHANGELOG.md)

### Issue note ma non bloccanti ⏳

| #   | Issue                                                                     | Impatto              | Risoluzione prevista                                  |
| --- | ------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------- |
| 2   | **`_password_cache` module-global** — non scala con multi-worker          | Medio                | Redis o DB in Fase 2                                  |
| 9   | **No password strength validation** — password di 1 char accettata        | ✅ Risolto (PR #208) | —                                                     |
| 10  | **Header injection via filename** — `Content-Disposition` non sanitizzato | ✅ Risolto (PR #208) | —                                                     |
| 14  | **Nessun integration/E2E test**                                           | 🟡 In corso          | Playwright futuro                                     |
| 18  | **Large file upload — nessun progress indicator**                         | ✅ Risolto (PR #206) | —                                                     |
| 19  | **Find & Replace non funziona**                                           | Medio (UX)           | Inline text editor                                    |
| 20  | **Admin bug report — campi mancanti**                                     | ✅ Risolto (PR #204) | —                                                     |
| 21  | **Frontend coverage 70%** — 247 test su 50 file                           | ✅ Risolto (PR #233) | `.specs/plans/chore-frontend-100-percent-coverage.md` |

### Da risolvere/note ⏳

> **⚠️ Security audit 2026-07-09 — Risolte 20/24 issue (83%).** Vedi tabella sopra per le rimanenti.
>
> Riepilogo fix applicati al 2026-07-11:
>
> - ✅ `SECRET_KEY` default → vuoto (forza config esplicita)
> - ✅ `DEBUG` default → `False`
> - ✅ Health check `GET /health`
> - ✅ `undo()`/`redo()` page_count → `fitz.open().page_count`
> - ✅ `_read_file_with_password` → tutte le operazioni PDF
> - ✅ Rate limiting → slowapi (login 5/min, register 3/h, forgot-password 3/h)
> - ✅ Dipendenze vulnerabili → PyJWT 2.13.0, python-multipart 0.0.31, pytest 9.0.3
> - ✅ CodeQL path-injection → `_validate_uuid()` in storage.py
> - ✅ Password strength validation → min 8 char + uppercase + lowercase + digit
> - ✅ Header injection sanitization → `sanitize_filename()` su Content-Disposition
> - ✅ Graceful shutdown → cleanup PyMuPDF handles su SIGTERM
> - ✅ CSRF protection → middleware con cookie token
> - ✅ JWT httpOnly cookie → addio localStorage XSS
> - ✅ GitHub: 0 Dependabot alert attivi, 0 Code Scanning alert attivi

> **🔴 Lezione appresa (2026-07-13) — Bug post-deploy su Render:**
>
> Dopo il deploy su Render, 4 bug hanno bloccato l'uso dell'applicazione nonostante tutti i test passassero in sviluppo (256 test, 0 failure). Cause identificate:
>
> 1. **Cookie cross-origin non inviati** — Il frontend (`api.ts`) non passava `credentials: 'include'`, quindi il cookie httpOnly `access_token` non veniva mai inviato al backend su domini diversi. ❌ I test usavano `Authorization: Bearer` header invece del flusso cookie-based reale.
> 2. **`SameSite=Lax` in produzione** — Il cookie era impostato con `samesite="lax"` che blocca i cookie cross-origin. Fixato con `samesite="none"` quando `DEBUG=False`.
> 3. **CSRF bloccava `/auth/logout`** — Endpoint non exempt. Fixato aggiungendolo a `CSRF_EXEMPT_PATHS`.
> 4. **Email droppata da SendGrid** — `noreply@pdfeditor.app` non verificato come sender su SendGrid. Fix: cambiato default a `noreply@mirkobechini.com`.
>
> **Conseguenza strutturale: i test non rilevavano questi bug perché:**
>
> - CSRF e rate limiting disabilitati nei test (necessario per TestClient)
> - TestClient simula stesso-origin (non cross-origin)
> - Test usavano Bearer header invece del flusso cookie-based
> - Mock totale di `jwt.decode` in test Google OAuth
>
> **Rimedio:** Riscritti i test auth per verificare il flusso cookie-based reale. Aggiunto script `scripts/seed_users_from_sqlite.py` per migrare dati SQLite → PostgreSQL (non necessario — utenti già presenti su Render).

> **Nota:** Tutte le feature prioritarie Fase 1 completate. PostgreSQL migration completata su Render. Reset password email via SendGrid/Cloudflare attiva (dominio verificato). Admin send reset via dashboard implementato. User bug report status visibile in profilo.

> **Nota tecnica:** Il warning `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated; install httpx2 instead` non è fixabile dal nostro codice. La libreria `httpx2` non esiste ancora, è una futura release di starlette. Ignorare.

> **🔑 MCP Servers disponibili:**
>
> - **Stripe:** MCP server ufficiale a `https://mcp.stripe.com` (OAuth). Repo: `stripe/ai`. Per gestire abbonamenti e pagamenti.
> - **Render:** MCP server ufficiale `render-oss/render-mcp-server` (Go, 144★). Per deploy e gestione servizi Render.
> - **Railway:** MCP server ufficiale `railwayapp/railway-mcp-server` (JS, 192★, archived). Community: `jason-tan-swe/railway-mcp` (TS, 73★).

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

### Stato attuale: 93% (256 test, 0 failures, 0 warnings)

| Modulo                                                                                            | Coverage | Note                   |
| ------------------------------------------------------------------------------------------------- | -------- | ---------------------- |
| `security.py`, `config.py`, `merge_split.py`, `metadata.py`, `reorder.py`, `text.py`, `unlock.py` | 100%     | ✅                     |
| `s3_storage.py`                                                                                   | 96%      | Mock boto3             |
| `database.py`, `user_repo.py`                                                                     | 95%      | 🟡                     |
| `email_service.py`, `convert.py`                                                                  | 94%      | 🟡                     |
| `main.py`, `auth.py`, `admin.py`, `deps.py`, `undo_redo.py`, `bug_report.py`                      | 90-94%   | 🟡                     |
| `auth_service.py`                                                                                 | 92%      | 🟡                     |
| `csrf.py`                                                                                         | 100%     | ✅                     |
| `storage.py`                                                                                      | 100%     | ✅                     |
| `pdf_service.py`                                                                                  | 85%      | 🔴 55 linee error path |
| `pdf_merge_split_service.py`                                                                      | 92%      | ✅ (nuovo)             |
| **TOTALE**                                                                                        | **93%**  |                        |

### Cosa manca per il 100%

- ~49 linee facili (error path endpoint, 403, 404) — 1-2h
- ~17 linee medie (S3/local switch) — 0h ✅ completato
- ~55 linee difficili (pdf_service.py error path) — 2-3h

## Coverage test frontend

### Stato attuale: 67.5% (250 test, 50 files, 0 failures)

| Modulo                         | Coverage | Test             |
| ------------------------------ | -------- | ---------------- |
| `login/page.tsx`               | 100%     | ✅               |
| `register/page.tsx`            | 93%      | ✅               |
| `landing/*` components         | 100%     | ✅               |
| `profile/page.tsx`             | 96%      | ✅               |
| `lib/auth.tsx`                 | 67%      | 🟡               |
| `lib/pdfPreview.ts`            | 90%      | ✅               |
| `lib/usePdfJs.ts`              | 88%      | ✅               |
| `components/Sidebar.tsx`       | 63%      | 🟡               |
| `components/AppLayout.tsx`     | 85%      | ✅               |
| `components/Toolbar.tsx`       | 68%      | 🟡               |
| `components/PdfViewer.tsx`     | 85%      | ✅ (mock PDF.js) |
| `components/ProtectDialog.tsx` | 97%      | ✅               |
| `components/ReplaceTextDialog` | 96%      | ✅               |
| `components/DeleteModal.tsx`   | 86%      | ✅               |
| `components/PdfThumbnail.tsx`  | 96%      | ✅               |
| `components/BugReportDialog`   | ~70%     | 🟡               |
| `components/GoogleLoginButton` | 48%      | 🔴               |
| `admin/page.tsx`               | 70%      | 🟡               |
| `app/page.tsx` (editor)        | ~90%     | ✅ (mock)        |
| `forgot-password/page.tsx`     | 95%      | ✅               |
| `reset-password/page.tsx`      | 94%      | ✅               |
| `MergeDialog/ReorderDialog`    | ~30-67%  | 🔴               |
| `RemoveDialog`                 | 44%      | 🔴               |
| **Backend**                    | **93%**  |                  |

### Cosa manca per il 100%

- Dialoghi complessi (ReorderDialog 30%, SplitDialog 37%, MergeDialog 67%)
- Componenti minori (RemoveDialog 44%, GoogleLoginButton 48%)

### Obiettivo: 80-100%

### Fasi successive (macro)

Dopo il completamento delle feature pendenti della Fase 1, il progetto prosegue con le seguenti macro-fasi:

- ⬜ **Fase 1c — Desktop app (Tauri v2)** — Setup Tauri + Next.js build statica. PyInstaller per bundle FastAPI in eseguibile. Sidecar: avvio FastAPI locale all'avvio. SQLite locale per dati offline. Installer per Windows (primario), macOS/Linux (secondario).
- ✅ **Fase 2 — Web app su cloud** — Deploy FastAPI su Render. PostgreSQL cloud. Upload file su S3 (Cloudflare R2). Next.js static export. **[COMPLETATA]** — 2026-07-10.
- ⬜ **Fase 3 — Cloud sync** — Sync bidirezionale SQLite ↔ PostgreSQL (UUID + timestamp). Risoluzione conflitti (lock ottimistico). Modalità offline/online seamless.
- ⬜ **Fase 4 — Mobile app (React Native)** — Setup React Native (Expo bare workflow). Logica React condivisa (API client, hooks auth, utility PDF). UI nativa. Viewer PDF.js via WebView. SSO Google login. Store deployment (Google Play / Apple).

### Feature minori

> 📋 **Storico completo:** Vedi [`CHANGELOG.md`](./CHANGELOG.md)

### Feature pianificate (in ordine di priorità)

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

### Feature pianificate (in ordine di priorità)

> 📋 **Completate:** Vedi [`CHANGELOG.md`](./CHANGELOG.md)

#### 🔵 Priorità BASSA / Future

- ⬜ **Inline text editor** (sostituisce Find&Replace) — Piano: `.specs/plans/feature-inline-text-editor.md`.
- ⬜ **Stripe MCP Subscriptions** — Piano: `.specs/plans/feature-stripe-mcp-subscriptions.md`.
- ⬜ **AI PDF editing service** — Piano: `.specs/plans/feature-ai-pdf-editing.md`.
- ⬜ **Conferma email account** — Piano: `.specs/plans/feature-email-confirmation.md`.
- ⬜ **E2E Playwright tests** — Piano: `.specs/plans/chore-security-improvements.md`.
- ⬜ **Tauri v2 desktop** — Fase 1c.
- ⬜ **Cloud sync SQLite↔PostgreSQL** — Fase 3.
- ⬜ **Mobile React Native** — Fase 4.

### Bug aperti su Render (deploy 2026-07-12)

| Bug                                              | Issue | Risoluzione                                  |
| ------------------------------------------------ | ----- | -------------------------------------------- |
| Google OAuth `origin_mismatch` / `Invalid token` | —     | 🟡 Serve `GOOGLE_CLIENT_ID` in env su Render |
| Login normale non funzionante                    | #260  | ✅ Risolto (PR #261) — cookie cross-origin   |
| Reset password email non arriva                  | —     | ✅ Fixato (PR #263) — SendGrid HTTP API      |
| Immagine monkey logo mancante                    | #257  | 🟡 File esiste — probabile cache Cloudflare  |

### Bug aperti (post-deploy 2026-07-13)

| Bug                                                 | Issue | Piano                                    | Priorità |
| --------------------------------------------------- | ----- | ---------------------------------------- | -------- |
| Google OAuth `origin_mismatch` / `Invalid token`    | —     | `.specs/plans/bug-google-oauth-token.md` | 🟥 HIGH  |
| Dark mode dropdown illeggibili (testo bianco)       | #266  | ✅ Risolto — CSS globale in globals.css  | ✅       |
| Bug report: select categoria invece di testo libero | #264  | ✅ Risolto (PR #265)                     | ✅       |
| Contrasto testo dialog in dark mode                 | —     | ✅ Risolto (PR #286)                     | ✅       |

### Bug risolti (2026-07-13)

| Bug                                              | Issue | Risoluzione                                   |
| ------------------------------------------------ | ----- | --------------------------------------------- |
| Google OAuth `origin_mismatch` / `Invalid token` | —     | 🟡 Serve `GOOGLE_CLIENT_ID` in env su Render  |
| Login normale non funzionante                    | #260  | ✅ Risolto (PR #261) — cookie cross-origin    |
| Reset password email non arriva                  | #262  | ✅ Risolto (PR #263) — SendGrid HTTP API      |
| Immagine monkey logo mancante                    | #257  | 🟡 File esiste — probabile cache Cloudflare   |
| Sidebar `Caricamento PDF fallito`                | —     | ✅ Risolto (PR #277) — cookie/XHR credentials |
| Upload PDF `Network error`                       | —     | ✅ Risolto (PR #277) — `xhr.withCredentials`  |
| Admin panel `Nessun utente`                      | —     | ✅ Risolto (PR #277) — cookie auth coerente   |
| Doppia area drag-drop                            | —     | ✅ Risolto (PR #280) — solo drop area viewer  |
| Messaggi errore login misti IT/EN                | —     | ✅ Risolto (PR #282) — mapping + i18n         |
| Download PDF con backend S3                      | —     | ✅ Risolto (PR #284) — storage cross-backend  |
| Contrasto testo dialog in dark mode              | —     | ✅ Risolto (PR #286) — classi dark text       |

### Piani aggiornati (2026-07-14)

- ✅ Creato `.specs/plans/bug-dark-mode-dialog-text-contrast.md` (PR #286)
- ✅ Creato `.specs/plans/bug-s3-download-storage-backend.md` (PR #284)
- ✅ Creato `.specs/plans/chore-error-messages-standardization.md` (Planning)

---

## Audit 2026-07-14 — Nuovi bug trovati nel codice

Durante una revisione approfondita del codice (2026-07-14), sono stati identificati 21 bug/addirittura criticità non ancora documentati, più 10 opportunità di miglioramento. Vedi `.specs/plans/bug-audit-*.md` per ogni fix.

### 🚨 Critici (da fixare subito)

| ID  | File                                  | Riga    | Problema                                                                       |
| --- | ------------------------------------- | ------- | ------------------------------------------------------------------------------ |
| B1  | `backend/app/api/v1/auth.py`          | 129-134 | ✅ Risolto (PR #288) — rimosso secondo blocco dead code                        |
| B2  | `backend/app/services/pdf_service.py` | 28-35   | ✅ Risolto (PR #290) — rimosso codice morto (`_open_pdf_handles` mai popolato) |
| B3  | `backend/app/services/pdf_service.py` | 68-75   | ✅ Risolto (PR #292) — `_read_file_with_password()` lancia ValueError          |
| B4  | `frontend/src/app/lib/api.ts`         | 80      | ✅ Risolto (PR #294) — rimosso `headers` duplicato in `uploadPdf()`            |
| B5  | `frontend/src/app/app/page.tsx`       | 189-200 | `handleDelete` non chiama `api.deletePdf` — desync UI/DB                       |

### ⚠️ Alti

| ID  | File                                        | Riga  | Problema                                                                |
| --- | ------------------------------------------- | ----- | ----------------------------------------------------------------------- |
| B6  | `backend/app/core/config.py`                | 13-14 | `SECRET_KEY` vuoto di default — token trivially forgeable               |
| B7  | `backend/app/main.py`                       | 72-76 | `_run_migrations()` chiamato 2 volte (ridondante)                       |
| B8  | `backend/app/main.py`                       | 61    | `_add_missing_columns()` silenzia TUTTE le eccezioni                    |
| B9  | `backend/app/core/config.py`                | 74-78 | `SUPER_ADMIN_EMAIL` default pericoloso (`admin@pdfeditor.local`)        |
| B10 | `frontend/src/app/lib/auth.tsx`             | 40-48 | `login()` fallisce silenziosamente — token settato ma UI non aggiornata |
| B11 | `frontend/src/app/lib/auth.tsx`             | 72    | `logout()` non gestisce errori — eccezione blocca setToken/setUser      |
| B12 | `backend/app/api/v1/convert.py`             | 114   | Check dimensione file inconsistente (`>` vs `>=`)                       |
| B13 | `frontend/src/app/lib/auth.tsx`             | 35    | Race condition `getMe()` iniziale — flash "logged out"                  |
| B14 | `frontend/src/app/components/PdfViewer.tsx` | 63    | Cleanup script tag rompe multi-instanza PdfViewer                       |

### 🟡 Medi

| ID  | File                                              | Riga    | Problema                                                            |
| --- | ------------------------------------------------- | ------- | ------------------------------------------------------------------- |
| B15 | `frontend/src/app/lib/api.ts`                     | 110     | `uploadPdfWithProgress` ignora JSON error body                      |
| B16 | `frontend/src/app/components/Sidebar.tsx`         | 28      | `useEffect` missing `loadFiles` in dependency array                 |
| B17 | `backend/app/services/auth_service.py`            | 95-108  | Google OAuth certs lookup — dead code `if` block                    |
| B18 | `backend/app/services/pdf_service.py`             | 18      | `_password_cache` globale non pulita su shutdown                    |
| B19 | `backend/app/services/pdf_merge_split_service.py` | 48-56   | Resource leak in `merge()` su eccezione                             |
| B20 | `backend/app/api/v1/admin.py`                     | 32      | Tipo di ritorno errato (`list[UserResponse]` vs `UserListResponse`) |
| B21 | `frontend/src/app/app/page.tsx`                   | 168-177 | `handleEditText` dead code — mai chiamata                           |

### 🛠 Opportunità di miglioramento (leggibilità/performance)

| ID  | File                                                | Problema                                                           |
| --- | --------------------------------------------------- | ------------------------------------------------------------------ |
| R1  | `PdfViewer.tsx`, `pdfPreview.ts`, `usePdfJs.ts`     | URL PDF.js hardcoded in 3 file (versione 3.11.174)                 |
| R2  | `PdfViewer.tsx`                                     | `(window as any).pdfjsLib` usato 6+ volte                          |
| R3  | `PdfViewer.tsx`                                     | `useRef<any>` per `pdfDocRef` e `renderTaskRef`                    |
| R4  | `backend/app/api/v1/upload.py:83`                   | Import dentro funzione (`PdfRepository`)                           |
| R5  | `backend/app/services/email_service.py:85`          | `except Exception` silenzioso — perdita stack trace                |
| R6  | `frontend/src/app/lib/api.ts`                       | `resetPassword()` e `updateProfile()` restituiscono `Promise<any>` |
| R7  | `frontend/src/app/components/GoogleLoginButton.tsx` | `require()` dinamico in Next.js                                    |
| R8  | `backend/app/api/v1/metadata.py:28`                 | `MetadataResponse(**meta)` vs `.model_validate()`                  |
| R9  | `frontend/src/app/lib/api.ts`                       | CDN versioni duplicate in 3 file                                   |
| R10 | `backend/app/core/config.py`                        | `ALLOWED_ORIGINS` comma-separated fragile                          |

### Priorità fix bug

```
B1-B5 (critici) → B6-B14 (alti) → B15-B21 (medi) → R1-R10 (miglioramenti)
```
