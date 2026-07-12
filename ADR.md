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
| 21  | **Frontend coverage 35%** — solo 108 test su ~30 componenti               | Medio                | `.specs/plans/chore-frontend-100-percent-coverage.md` |

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

> **Nota:** Tutte le feature prioritarie Fase 1 completate. PostgreSQL migration completata su Render. Reset password email delivery in pausa (attesa dominio custom per SendGrid sender verification).

> **Nota tecnica:** Il warning `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated; install httpx2 instead` non è fixabile dal nostro codice. La libreria `httpx2` non esiste ancora, è una futura release di starlette. Ignorare.

> **🔑 MCP Servers disponibili:**
>
> - **Stripe:** MCP server ufficiale a `https://mcp.stripe.com` (OAuth). Repo: `stripe/ai`. Per gestire abbonamenti e pagamenti.
> - **Render:** MCP server ufficiale `render-oss/render-mcp-server` (Go, 144★). Per deploy e gestione servizi Render.
> - **Railway:** MCP server ufficiale `railwayapp/railway-mcp-server` (JS, 192★, archived). Community: `jason-tan-swe/railway-mcp` (TS, 73★).

## Coverage test backend

### Stato attuale: 92% (228 test, 0 failures, 0 warnings)

| Modulo                                                                                            | Coverage | Note                   |
| ------------------------------------------------------------------------------------------------- | -------- | ---------------------- |
| `security.py`, `config.py`, `merge_split.py`, `metadata.py`, `reorder.py`, `text.py`, `unlock.py` | 100%     | ✅                     |
| `s3_storage.py`                                                                                   | 96%      | Mock boto3             |
| `database.py`, `user_repo.py`                                                                     | 95%      | 🟡                     |
| `email_service.py`, `convert.py`                                                                  | 94%      | 🟡                     |
| `main.py`, `auth.py`, `admin.py`, `deps.py`, `undo_redo.py`                                       | 90-93%   | 🟡                     |
| `auth_service.py`                                                                                 | 92%      | 🟡                     |
| `storage.py`                                                                                      | 82%      | 🟠 S3 path             |
| `pdf_service.py`                                                                                  | 86%      | 🔴 55 linee error path |
| **TOTALE**                                                                                        | **92%**  |                        |

### Cosa manca per il 100%

- ~49 linee facili (error path endpoint, 403, 404) — 1-2h
- ~17 linee medie (S3/local switch) — 1h
- ~55 linee difficili (pdf_service.py error path) — 2-3h

## Coverage test frontend

### Stato attuale: 47% (156 test, 36 files, 0 failures)

| Modulo                        | Coverage | Test             |
| ----------------------------- | -------- | ---------------- |
| `login/page.tsx`              | 100%     | ✅               |
| `register/page.tsx`           | 93%      | ✅               |
| `landing/*` components        | 100%     | ✅               |
| `profile/page.tsx`            | 96%      | ✅               |
| `lib/auth.tsx`                | 69%      | 🟡               |
| `lib/pdfPreview.ts`           | 90%      | ✅               |
| `components/Sidebar.tsx`      | 63%      | 🟡               |
| `components/AppLayout.tsx`    | 58%      | 🟡               |
| `components/Toolbar.tsx`      | 42%      | 🟡               |
| `components/PdfViewer.tsx`    | 51%      | 🔴 (mock PDF.js) |
| `components/DeleteModal.tsx`  | 86%      | ✅               |
| `components/PdfThumbnail.tsx` | 96%      | ✅               |
| `admin/page.tsx`              | 40%      | 🟡               |
| `app/page.tsx` (editor)       | 0%       | ❌               |
| `forgot-password/page.tsx`    | 0%       | ❌               |
| `reset-password/page.tsx`     | 0%       | ❌               |
| `lib/api.ts`                  | 0%       | ❌               |
| `lib/i18n.ts`                 | 0%       | ❌               |
| **TOTALE**                    | **47%**  |                  |

### Obiettivo: 60-70%

Servono ancora test per: AdminPage (bugs tab), ForgotPassword, ResetPassword, api.ts, i18n.ts, app/page.tsx (editor).

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
| Email rate limit      | 🟡 Planned   | Catch 429, disable button, admin override               |
| Encryption at rest    | ❌ Future    | PostgreSQL encryption plugin (Phase 3+)                 |
| Rate limit login      | ✅ Protected | slowapi: 5/min login, 3/h register, 3/h forgot-password |
| 2FA support           | ❌ Future    | Low priority, evaluable in Phase 3+                     |

### Feature pianificate (in ordine di priorità)

> 📋 **Completate:** Vedi [`CHANGELOG.md`](./CHANGELOG.md)

#### 🔴 Priorità ALTA

- ⬜ **Invio email reale reset password** — Attesa dominio Cloudflare per SendGrid sender verification.
- ⬜ **Admin: invia reset password via dashboard** — Piano: `.specs/plans/feature-admin-send-reset-email.md`.
- ⬜ **Frontend coverage 60-70%** — Piano: `.specs/plans/chore-frontend-100-percent-coverage.md`.
- ⬜ **User bug report status in dashboard** — Piano: `.specs/plans/feature-user-bug-report-status.md`.

#### 🟡 Priorità MEDIA

- ⬜ **Miglioramenti UI/UX webapp** — Piano: `.specs/plans/feature-ui-ux-improvements.md`.
- ⬜ **PDF naming preservation** — Piano: `.specs/plans/feature-pdf-naming-preservation.md`.
- ⬜ **PDF compression** — Piano: `.specs/plans/feature-pdf-compression.md`.
- ⬜ **SendGrid rate limiting handling** — Piano: `.specs/plans/feature-sendgrid-rate-limit-handling.md`.
- ⬜ **Landing page footer fix** — Piano: `.specs/plans/feature-landing-footer-links.md`.
- ⬜ **License tier button skin** — Piano: `.specs/plans/feature-license-tier-button-skin.md`.
- ⬜ **Privacy Policy page** — Piano: `.specs/plans/feature-privacy-policy.md`.
- ⬜ **CI/CD GitHub Actions** — Backend + frontend test, deploy su Render via main. Piano: `.specs/plans/chore-cicd-pipeline.md`.

#### 🔵 Priorità BASSA / Future

- ⬜ **Inline text editor** (sostituisce Find&Replace) — Piano: `.specs/plans/feature-inline-text-editor.md`.
- ⬜ **Stripe MCP Subscriptions** — Piano: `.specs/plans/feature-stripe-mcp-subscriptions.md`.
- ⬜ **AI PDF editing service** — Piano: `.specs/plans/feature-ai-pdf-editing.md`.
- ⬜ **Conferma email account** — Piano: `.specs/plans/feature-email-confirmation.md`.
- ⬜ **E2E Playwright tests** — Piano: `.specs/plans/chore-security-improvements.md`.
- ⬜ **Tauri v2 desktop** — Fase 1c.
- ⬜ **Cloud sync SQLite↔PostgreSQL** — Fase 3.
- ⬜ **Mobile React Native** — Fase 4.

### Code Review — Issue identificate e risolte

| #   | Issue                                                           | Tipo           | Risoluzione                |
| --- | --------------------------------------------------------------- | -------------- | -------------------------- |
| 1   | **Password strength non validata su reset password**            | Bug            | ✅ PR #218                 |
| 2   | **License features seed duplicato** (main.py + conftest.py)     | Duplicazione   | ✅ PR #222                 |
| 3   | **PDF.js loading duplicato in 3 dialoghi**                      | Duplicazione   | ✅ PR #220 (usePdfJs hook) |
| 4   | **ADR.md troppo lungo** — Bug tracker storico era rumore        | Documentazione | ✅ PR #224 (CHANGELOG.md)  |
| 5   | **`pdf_service.py` 406 linee** — troppe responsabilità          | Refactoring    | 🟡 Valutare suddivisione   |
| 6   | **`api.ts` frontend 400+ linee** — tutti i metodi in un file    | Refactoring    | 🟡 Valutare suddivisione   |
| 7   | **`Sidebar.tsx` — nessun feedback errore su loadFiles fallito** | UX             | 🟢 Bassa priorità          |

<!-- Qui finisce Fase 1. Prossime fasi in "Fasi successive (macro)" sopra -->
