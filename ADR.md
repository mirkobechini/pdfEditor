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

> 📋 **Storico completo dei fix:** Vedi [`CHANGELOG.md`](./CHANGELOG.md) per l'elenco di tutte le PR e issue.

### Issue note ma non bloccanti ⏳

| #   | Issue                                                            | Impatto              | Risoluzione prevista                                  |
| --- | ---------------------------------------------------------------- | -------------------- | ----------------------------------------------------- |
| 2   | **`_password_cache` module-global** — non scala con multi-worker | Medio                | Redis o DB in Fase 2 (✅ B18: cleanup su shutdown)    |
| 14  | **Nessun integration/E2E test**                                  | Medio                | ⬜ Playwright futuro (T7)                             |
| 19  | **Find & Replace non funziona**                                  | Medio                | ⬜ Inline text editor (feature #11)                   |
| 21  | **Frontend coverage 70%** — 247 test su 50 file                  | ✅ Risolto (PR #233) | `.specs/plans/chore-frontend-100-percent-coverage.md` |

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

### Stato attuale: 96% (320 test, 0 failures, 0 warnings)

| Modulo                                                                                            | Coverage | Note                 |
| ------------------------------------------------------------------------------------------------- | -------- | -------------------- |
| `security.py`, `config.py`, `merge_split.py`, `metadata.py`, `reorder.py`, `text.py`, `unlock.py` | 100%     | ✅                   |
| `auth.py`, `csrf.py`, `storage.py`                                                                | 100%     | ✅                   |
| `s3_storage.py`                                                                                   | 99%      | 1 linea (def)        |
| `auth_service.py`                                                                                 | 98%      | 3 linee Google login |
| `convert.py`                                                                                      | 98%      | 1 linea (def)        |
| `database.py`, `user_repo.py`                                                                     | 95-98%   | 🟡                   |
| `admin.py`                                                                                        | 96%      | 🟡                   |
| `main.py`                                                                                         | 87%      | 🟡 startup code      |
| `pdf_service.py`                                                                                  | 88%      | 🔴 error path        |
| `pdf_merge_split_service.py`                                                                      | 97%      | 🟡                   |
| `models/*`, `repositories/*`, `email_service.py`                                                  | 100%     | ✅                   |
| **TOTALE**                                                                                        | **96%**  |                      |

### Cosa manca per il 100%

- ~39 linee difficili (pdf_service.py error path) — mock fitz
- ~19 linee startup code (main.py) — solo produzione
- ~18 linee varie (def line, PostgreSQL branch, S3)

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

---

## 📋 Stato attuale (2026-07-15)

### ✅ Completati — 21 bug + 10 miglioramenti

> Vedi [`CHANGELOG.md`](./CHANGELOG.md) per l'elenco dettagliato con PR e issue.

| Categoria              | Quantità | PR                                                   |
| ---------------------- | -------- | ---------------------------------------------------- |
| B1-B5 (critici)        | 5 bug    | #288, #290, #292, #294, #296                         |
| B6-B14 (alti)          | 9 bug    | #298, #300, #302, #304, #306, #308, #310, #312, #314 |
| B15-B21 (medi)         | 7 bug    | #316, #318, #320, #322, #324, #326, #328             |
| R1-R10 (miglioramenti) | 10 tasks | #330, #332, #334, #336, #338, #341, #343, #345       |

### 🔴 Ancora da fare — Ordinato per priorità

#### 🟥 ALTA

| #   | Task                                        | Tipo     | Piano                                     |
| --- | ------------------------------------------- | -------- | ----------------------------------------- |
| 1   | **Bug Google OAuth** — ✅ Risolto (PR #347) | 🐛 Bug   | ✅ `bug-google-oauth-token.md`            |
| 2   | **Backend coverage 100%** — attuale 93%     | 🧹 Chore | `chore-backend-100-percent-coverage.md`   |
| 3   | **Frontend coverage 100%** — attuale 67.5%  | 🧹 Chore | `chore-frontend-100-percent-coverage.md`  |
| 4   | **Standardizzazione messaggi errore** IT/EN | 🧹 Chore | `chore-error-messages-standardization.md` |

#### 🟡 MEDIA

| #   | Task                         | Piano                                     |
| --- | ---------------------------- | ----------------------------------------- |
| 5   | SendGrid rate limit handling | `feature-sendgrid-rate-limit-handling.md` |
| 6   | Password visibility toggle   | `feature-password-visibility-toggle.md`   |
| 7   | PDF compression              | `feature-pdf-compression.md`              |
| 8   | PDF naming preservation      | `feature-pdf-naming-preservation.md`      |
| 9   | License tier button skin     | `feature-license-tier-button-skin.md`     |
| 10  | UI/UX improvements           | `feature-ui-ux-improvements.md`           |
| 11  | Inline text editor           | `feature-inline-text-editor.md`           |

#### Performance (P1-P6)

| #   | Problema                                                     | Impatto                                          |
| --- | ------------------------------------------------------------ | ------------------------------------------------ |
| P1  | `upload.py:60` — File letto interamente in RAM (fino a 50MB) | ✅ Risolto (PR #349) — lettura a chunk 1MB       |
| P2  | `PdfViewer.tsx` — Race condition zoom+pagina                 | ✅ Risolto (PR #351) — contatore `renderKeyRef`  |
| P3  | `main.py` — `create_all` chiamato 2 volte (~100ms startup)   | ✅ Risolto (PR #300)                             |
| P4  | `PdfViewer.tsx` — Blob URL non revocati su unmount           | ✅ Risolto (PR #353) — cleanup effect con ref    |
| P5  | `pdf_service.py` — Password cache mai invalidata             | ✅ Risolto (PR #322)                             |
| P6  | `Toolbar.tsx` — Keyboard listener rimosso/riaggiunto         | ✅ Risolto (PR #355) — refs per callback stabili |

#### Test mancanti (T1-T7)

| #   | Area                        | Coverage |
| --- | --------------------------- | -------- |
| T1  | `ReorderDialog`             | 30%      |
| T2  | `SplitDialog`               | 37%      |
| T3  | `RemoveDialog`              | 44%      |
| T4  | `MergeDialog`               | 67%      |
| T5  | `GoogleLoginButton`         | 48%      |
| T6  | `pdf_service.py` error path | 85%      |
| T7  | E2E Playwright tests        | 0%       |

#### 🔵 BASSA / Future

| #   | Task                                  | Piano                                 |
| --- | ------------------------------------- | ------------------------------------- |
| 12  | Stripe MCP Subscriptions              | `feature-stripe-mcp-subscriptions.md` |
| 13  | AI PDF editing                        | `feature-ai-pdf-editing.md`           |
| 14  | Tauri v2 Desktop (Fase 1c)            | —                                     |
| 15  | Cloud sync SQLite↔PostgreSQL (Fase 3) | —                                     |
| 16  | Mobile React Native (Fase 4)          | —                                     |

<!-- Fine Fase 1 — si prosegue con la roadmap sopra -->
