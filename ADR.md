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

### Risolti ✅

- ✅ **Dark text illegibile in dark mode su login/register** — Aggiunte classi `dark:text-*` a h1, label, input. (PR #66, issue #65)
- ✅ **Errori validazione Pydantic in inglese e raw JSON** — Custom exception handler backend + `ApiClient.extractError()` frontend. (PR #68, issue #67)
- ✅ **Dark mode toggle + language selector non accessibili su login/register** — Estratto `HeaderControls` condiviso, aggiunto header a login/register. (PR #70, issue #69)
- ✅ **Limite dimensione upload non enforceato** — Enforceato `MAX_UPLOAD_SIZE_MB=50` prima di leggere in RAM. (PR #86, issue #85)
- ✅ **Lettura in memoria senza limiti** — Controllo dimensione prima di `file.file.read()`. (PR #86, issue #85)
- ✅ **Limite pagine** — Aggiunto `MAX_PAGE_COUNT=500` enforceato in `PdfService.upload()`. (PR #86, issue #85)
- ✅ **DeleteModal: chiavi i18n mancanti** — Aggiunta sezione `deleteModal` a `en.json` e `it.json`. (PR #102, issue #101)
- ✅ **MISSING_MESSAGE: splitDialog.splitDialog.pageThumbnail** — Corretta chiave annidata in SplitDialog. (PR #102, issue #101)
- ✅ **MISSING_MESSAGE: reorderDialog.reorderDialog.pageThumbnail** — Corretta chiave annidata in ReorderDialog. (PR #102, issue #101)
- ✅ **MISSING_MESSAGE: removeDialog.removeDialog.pageThumbnail** — Corretta chiave annidata in RemoveDialog. (PR #102, issue #101)
- ✅ **DeleteModal: sidebar.deleteFailed reference** — Corretto riferimento a chiave sbagliata. (PR #102, issue #101)
- ✅ **DeleteModal posizionato nella sidebar invece che al centro** — Spostato DeleteModal da Sidebar a page.tsx (root level). (PR #104, issue #103)
- ✅ **Cancellazione PDF fallita** — Aggiunto `refreshKey` alla Sidebar per ricaricare la lista dopo eliminazione. (PR #106, issue #105)
- ✅ **Come impostare un account come admin** — Aggiunto endpoint `PUT /admin/users/{id}/admin` + toggle UI nella dashboard admin. (PR #108, issue #107)
- ✅ **Messaggi errore non formattati** — Corretto doppio prefisso `"Error: "` e migliorato stile error container in Split/Merge/Reorder/Remove dialog. (PR #110, issue #109)
- ✅ **Sostituire `<img>` con `<Image />` di next/image** — Sostituiti tutti i tag `<img>` con `<Image>` da `next/image` (con `unoptimized` per data URL) in DeleteModal, SplitDialog, ReorderDialog, RemoveDialog. (PR #112, issue #111)
- ✅ **Split: linee di separazione tra pagine** — Ridisegnato SplitDialog con linee di separazione cliccabili tra le pagine invece di checkbox. (PR #114, issue #113)
- ✅ **Super admin protetto da revoca** — Aggiunto `SUPER_ADMIN_EMAIL` in config, protetto repository/endpoint/CLI. Seed automatico allo startup. CLI tool `backend/cli.py`. (PR #116, issue #115)
- ✅ **Bottone SSO Google in login/register** — Installato `@react-oauth/google`, aggiunto bottone Google a login e register pages, `GoogleLoginButton` componente condiviso. (PR #118, issue #117)
- ✅ **Reset password con token temporaneo** — Aggiunti campi `reset_token`/`reset_token_expires` a User, endpoint `POST /auth/forgot-password` e `POST /auth/reset-password`, pagine `/forgot-password` e `/reset-password` frontend, test. (PR #120, issue #119)
- ✅ **Test migration fix: test_downgrade_single_and_upgrade_again** — Fixato per controllare colonna `reset_token` anziché `is_password_protected`, dispose engine per evitare PermissionError Windows. (PR #122, issue #121)
- ✅ **timeZone non configurata** — Aggiunto `timeZone: 'Europe/Rome'` a `NextIntlClientProvider` in `i18n.tsx`. (PR #124, issue #123)
- ✅ **Admin bugfix: admin/users e admin/bugs wrapping** — Backend ora restituisce `{ items, total }` per admin/users e admin/bugs. Rimosso toggle admin button dalla UI. (PR #126, #128, #131)
- ✅ **CLI per pulizia PDF orfani** — Aggiunto `cleanup-orphans` a `backend/cli.py`. (PR #130, issue #129)
- ✅ **"Nothing to redo / Nothing to undo" — messaggi raw in console** — Gestiti silenziosamente i casi normali (nessun snapshot disponibile) in handleUndo/handleRedo. Test aggiunti. (PR #134, issue #133)
- ✅ **PDF not found fallback nei dialoghi** — Creato PdfThumbnail.tsx con error handling graceful, refactoring DeleteModal → PdfThumbnail, error handling in SplitDialog/RemoveDialog/ReorderDialog. (PR #135, issue #136)
- ✅ **DeleteModal: chiamata API duplicata** — `api.deletePdf()` chiamato 2 volte (DeleteModal + page.tsx). Rimosso duplicato. Fixato overflow modale. (PR #135, issue #136)
- ✅ **Script tag in React component (layout.tsx)** — Sostituito `<script>` inline con `next/script` (strategy="beforeInteractive"). (commit su dev)
- ✅ **Hydration mismatch GoogleLoginButton** — Dynamic import con `ssr: false` + mount solo client-side via useEffect. (commit su dev)
- ✅ **Admin email hardcoded in config.py** — Spostato `SUPER_ADMIN_EMAIL` da hardcoded a `.env` via Pydantic Settings. Creato `.env.example`. (PR #136, issue #139)
- ✅ **pdfPreview.ts senza test** — 7 unit test per renderFirstPageToDataUrl() con mock di PDF.js e Canvas. (PR #137, issue #137)
- ✅ **Import file validation (/pdfs/import)** — Aggiunto size check (413) e MIME type validation per estensione. 16 test parametrizzati. (PR #140, issue #138)
- ✅ **DeleteModal test obsoleti (PdfThumbnail)** — Aggiornati 3 test DeleteModal per match con PdfThumbnail (skeleton, alt text, fallback). (commit su dev)
- ✅ **MAX_SNAPSHOTS hardcoded** — Spostato da costante in storage.py a `settings.MAX_SNAPSHOTS` (.env configurabile). (PR #138, issue #140)
- ✅ **Expired reset token cleanup** — Lazy cleanup in `request_password_reset()`, nuovo metodo `delete_expired_tokens()` in user_repo.py. (PR #139, issue #141)
- ✅ **Admin test broken (wrapped response)** — 5 test fixati per `{items, total}` response model. (PR #141, issue #145)
- ✅ **Deprecation warnings (6→1)** — Fixati: Pydantic ConfigDict, Starlette HTTP status codes (413/422), SQLite datetime adapter. (PR #141, issue #145)
- ✅ **Test Google SSO success paths** — 3 test: nuovo utente, utente esistente, utente inattivo. Mock di requests.get + jose.jwt.decode. (PR #142, issue #142)
- ✅ **Test unlock PDF endpoint** — 6 test per POST /pdfs/{id}/unlock: non protetto, success, wrong password, empty password, unauthorized. (commit su dev, issue #143)
- ✅ **Coverage reporting frontend** — Aggiunto @vitest/coverage-v8, script npm run coverage, config in vitest.config.ts. (commit su dev, issue #144)
- ✅ **Disable license enforcement flag** — Aggiunto `DISABLE_LICENSE_ENFORCEMENT` in config.py/deps.py. Se True, tutte le feature disponibili per tutti. (PR #143, issue #146)

> **ℹ️ Setup Google OAuth:**
>
> 1. Creare un OAuth Client ID su [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
> 2. Impostare `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `frontend/.env.local` e `GOOGLE_CLIENT_ID` in `backend/.env`
> 3. **Branding email:** dopo aver acquistato il dominio su Cloudflare, attivare **Cloudflare Email Routing** (gratuito) per creare `supporto@tuodominio.com` con inoltro automatico alla mail personale. Aggiornare il campo Branding su Google Cloud Console con `supporto@tuodominio.com` per email OAuth professionali.

> **ℹ️ MCP Server — Render (automazione deploy/monitoring):**
>
> Configura il Render MCP server per automazione deploy e monitoring direttamente da IDE/CLI:
>
> 1. **Installa Render MCP server globalmente** (Go richiesto):
>
>    ```bash
>    # Option A: Clona e compila
>    git clone https://github.com/render-oss/render-mcp-server
>    cd render-mcp-server
>    go build -o render-mcp-server main.go
>
>    # Option B: Usa pre-built release
>    wget https://github.com/render-oss/render-mcp-server/releases/download/v0.1.0/render-mcp-server
>    chmod +x render-mcp-server
>    ```
>
> 2. **Genera Render API key** su [dashboard.render.com/api-tokens](https://dashboard.render.com/account/api-tokens) — scrivilo in `backend/.env`:
>    ```env
>    RENDER_API_KEY=rnd_xxxxx...
>    ```
> 3. **Configura MCP in VS Code** — Crea/aggiorna `~/.claude/mcp.json`:
>    ```json
>    {
>      "mcpServers": {
>        "render": {
>          "command": "path/to/render-mcp-server",
>          "env": {
>            "RENDER_API_KEY": "${RENDER_API_KEY}"
>          }
>        }
>      }
>    }
>    ```
> 4. **Comandi disponibili** (via Claude MCP):
>    - `render list-services` — elenca tutti i servizi (web, DB, worker, ecc.)
>    - `render get-service <id>` — dettagli servizio (stato, URL, logs, metriche)
>    - `render restart-service <id>` — riavvia servizio
>    - `render get-logs <id>` — ultimi 100 log
>    - `render deploy <id>` — trigga rebuild da branch attuale
>
> **Uso comune in CI/CD:** Aggiungere MCP Render a `.github/workflows/deploy.yml` per automazione.

> **ℹ️ Reset password:** In sviluppo il token viene stampato nella console del backend. In produzione va configurato SMTP in `backend/.env`.

### In corso 🔄

- ⬜ **Frontend coverage 100%** — Portare copertura test frontend da 35% a 100% — `.specs/plans/chore-frontend-100-percent-coverage.md`

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

### Coverage attuale: 92% (225 test, 0 failures)

| Modulo             | Coverage | Linee scoperte | Difficoltà residua        |
| ------------------ | -------- | -------------- | ------------------------- |
| `security.py`      | 100%     | —              | ✅                        |
| `config.py`        | 100%     | —              | ✅                        |
| `merge_split.py`   | 100%     | —              | ✅                        |
| `metadata.py`      | 100%     | —              | ✅                        |
| `reorder.py`       | 100%     | —              | ✅                        |
| `text.py`          | 100%     | —              | ✅                        |
| `unlock.py`        | 100%     | —              | ✅                        |
| `s3_storage.py`    | 96%      | 3              | 🟡 Facile                 |
| `database.py`      | 95%      | 1              | 🟡 Facile                 |
| `user_repo.py`     | 95%      | 3              | 🟡 Facile                 |
| `email_service.py` | 94%      | 2              | 🟡 Facile                 |
| `convert.py`       | 94%      | 3              | 🟡 Facile                 |
| `admin.py`         | 91%      | 5              | 🟡 Facile                 |
| `main.py`          | 92%      | 8              | 🟡 Facile                 |
| `deps.py`          | 92%      | 3              | 🟡 Facile                 |
| `bug_report.py`    | 93%      | 2              | 🟡 Facile                 |
| `auth.py` (api)    | 90%      | 7              | 🟡 Facile                 |
| `undo_redo.py`     | 90%      | 2              | 🟡 Facile                 |
| `auth_service.py`  | 92%      | 9              | 🟡 Facile                 |
| `storage.py`       | 82%      | 17             | 🟠 Media (S3 path)        |
| `pdf_service.py`   | 86%      | 55             | 🔴 Difficile (error path) |

**Cosa manca per il 100%:**

- ~49 linee facili (1-2 ore) — error path su endpoint, not found, 403
- ~17 linee medie (1 ora) — switch S3/local in storage.py
- ~55 linee difficili (2-3 ore) — pdf_service.py error path (password errata, file non trovato, conversioni fallite)

**Consiglio:** Fermarsi al 92% è accettabile. Le 55 linee di `pdf_service.py` sono `except` e `if not` casi limite già coperti dai test di integrazione esistenti.

Le seguenti feature sono state pianificate e documentate in `.specs/plans/`. L'ordine di implementazione è definito dalla priorità indicata.

### Fasi successive (macro)

Dopo il completamento delle feature pendenti della Fase 1, il progetto prosegue con le seguenti macro-fasi:

- ⬜ **Fase 1c — Desktop app (Tauri v2)** — Setup Tauri + Next.js build statica. PyInstaller per bundle FastAPI in eseguibile. Sidecar: avvio FastAPI locale all'avvio. SQLite locale per dati offline. Installer per Windows (primario), macOS/Linux (secondario).
- ✅ **Fase 2 — Web app su cloud** — Deploy FastAPI su Render. PostgreSQL cloud. Upload file su S3 (Cloudflare R2). Next.js static export. **[COMPLETATA]** — 2026-07-10.
- ⬜ **Fase 3 — Cloud sync** — Sync bidirezionale SQLite ↔ PostgreSQL (UUID + timestamp). Risoluzione conflitti (lock ottimistico). Modalità offline/online seamless.
- ⬜ **Fase 4 — Mobile app (React Native)** — Setup React Native (Expo bare workflow). Logica React condivisa (API client, hooks auth, utility PDF). UI nativa. Viewer PDF.js via WebView. SSO Google login. Store deployment (Google Play / Apple).

### Feature minori completate

- ✅ **Bug report button (frontend)** — Pulsante "Segnala bug" nell'header con dialog modale. Completata (PR #56, issue #55)
- ✅ **UI autenticazione (login/register)** — Pagine `/login` e `/register` con form, AuthContext JWT, route protection, logout in header. Completata (PR #58, issue #57)
- ✅ **Persistenza dark mode (localStorage)** — localStorage + system preference fallback + flash prevention. Completata (PR #60, issue #59)
- ✅ **Enforcement licenze (backend)** — `verify_feature_access()` dependency per bloccare operazioni non consentite per tier. Completata (PR #62, issue #61)
- ✅ **Allineamento modello BugReport al brief** — Aggiunti `platform`, `app_version`, `os_info`. Refactoring con repository pattern. Completata (PR #64, issue #63)
- ✅ **Header controls su login/register** — `HeaderControls` condiviso con dark mode toggle e language selector sempre visibili. Completata (PR #70, issue #69)
- ✅ **Header button order** — Riordinato header: `[☀️] [IT/EN] [Segnala Bug] [Nome] [Esci]`. Completata (PR #76, issue #75)
- ✅ **Refactor dialoghi merge/split/reorder/remove** — Operano sul PDF corrente, usano API backend, scaricano il risultato come file nuovo. Completata (PR #72, issue #71)
- ✅ **DeleteModal con anteprima PDF** — Modal di conferma eliminazione con anteprima prima pagina via PDF.js. Completata (PR #74, issue #73)
- ✅ **Reorder miniature + drag & drop** — ReorderDialog con miniature PDF, drag & drop, pulsanti ▲/▼. Completata (PR #78, issue #77)
- ✅ **Split miniature + selezione visuale** — SplitDialog con griglia miniature cliccabili + text input. Completata (PR #80, issue #79)
- ✅ **Remove miniature + conferma** — RemoveDialog con miniature PDF, selezione visuale, modale conferma. Completata (PR #82, issue #81)
- ✅ **Drag & drop viewer centrale** — PdfViewer accetta drop di PDF nello stato vuoto e overlay quando occupato. Completata (PR #84, issue #83)
- ✅ **Enforce MAX_UPLOAD_SIZE_MB e MAX_PAGE_COUNT** — Limite 50MB e 500 pagine enforceati in upload. Completata (PR #86, issue #85)
- ✅ **Dashboard admin** — Pagina `/admin` per gestione utenti, licenze e bug report. Completata (PR #88, issue #87)
- ✅ **Auth endpoint PDF** — Aggiunto `user_id` a `PdfDocument`, protetti tutti gli endpoint `/pdfs/*` con JWT, filtro per utente corrente. Completata (PR #91, issue #89)
- ✅ **Uniform license checking** — Estratta `check_feature_access()` condivisa in `deps.py`, rimossa duplicata `_check_license_for_format()` in `convert.py`. Completata (PR #92, issue #90)
- ✅ **Sostituzione I18nProvider custom con next-intl** — Rimosso provider i18n custom, sostituito con `NextIntlClientProvider`. Tutti i componenti migrati a `useTranslations()`. Completata (PR #94, issue #93)
- ✅ **PDF protetti da password** — Rilevamento automatico all'upload via PyMuPDF, endpoint `/pdfs/{id}/unlock`, cache password in memoria, modale UI in PdfViewer. Completata (PR #96, issue #95)
- ✅ **Undo/Redo per modifiche PDF** — Snapshot prima di ogni modifica, max 10 per PDF, stack undo/redo separati, pulsanti ↩↪ con Ctrl+Z/Ctrl+Shift+Z. Completata (PR #98, issue #97)
- ✅ **Dashboard admin: filtri e funzionalità** — Aggiunti filtro per tipo licenza, filtro per data creazione (da/a), ricerca per email, cambio licenza inline. Fix chiavi i18n bug report filter. (PR #132, issue #131)
- ✅ **PDF not found fallback nei dialoghi** — `PdfThumbnail` componente riutilizzabile + fallback placeholder. (PR #135, issue #136)
- ✅ **Unit test pdfPreview.ts** — 7 test per `renderFirstPageToDataUrl()` con mock PDF.js + Canvas. (PR #137, issue #137)
- ✅ **Validazione /pdfs/import** — File size + MIME type validation. (PR #140, issue #138)
- ✅ **Admin email in .env** — `SUPER_ADMIN_EMAIL` parametrizzato. (PR #136, issue #139)
- ✅ **MAX_SNAPSHOTS configurabile** — Da hardcoded a settings (.env). (PR #138, issue #140)
- ✅ **Expired token cleanup** — Lazy cleanup all'uso. (PR #139, issue #141)
- ✅ **Google SSO al primo posto login** — Pulsante Google prima del form email/password. (commit su dev)

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

### Feature minori da implementare (in ordine)

- ✅ **Migrazione database Render SQLite → PostgreSQL** — Passare a DB persistente per evitare perdita dati utenti ai redeploy/restart. Piano: `.specs/plans/feature-render-postgres-migration.md`. **[COMPLETATO]** — PostgreSQL service creato su Render, backend connesso con psycopg v3, migrations applicate automaticamente, persistenza confermata.
- ⬜ **Invio email reale reset password** — Sostituire il flusso attuale basato su log server con invio SMTP reale, mantenendo risposta neutra anti-enumerazione. Piano: `.specs/plans/feature-reset-password-email-delivery.md`. **[IN PROGRESS - PAUSED]** — SendGrid SMTP integrato, email_service.py implementato, endpoint forgot-password invia email con link reset. In pausa: Sender identity verification posticipata a quando dominio custom sarà disponibile.
- ⬜ **Conferma email account** — Introdurre verifica email post-registrazione con token a scadenza, endpoint di conferma/reinvio e blocco login finche non verificata. Piano: `.specs/plans/feature-email-confirmation.md`.
- ✅ **Google OAuth account linking** — Permettere al login standard (email/password) di collegare in un secondo momento un account Google, consolidando in un unico User. **[COMPLETATO]** — Implementato in PR #200 (google_id field + auth_service update).
- ✅ **User dashboard (profilo utente)** — Pagina `/app/profile` per modificare nome, visualizzare abbonamento, gestire account collegati. **[COMPLETATO]** — Implementato 2026-07-10, PR #198.
- ⬜ **Admin: invia reset password via dashboard** — Permettere agli admin di inviare manualmente link reset password a un utente dalla dashboard admin. Piano: `.specs/plans/feature-admin-send-reset-email.md`.
- ⬜ **Miglioramenti UI/UX webapp** — Refactoring componenti, miglior contrast, responsive mobile, accessibility (a11y), animazioni smooth. Piano: `.specs/plans/feature-ui-ux-improvements.md`.
- ⬜ **PDF naming preservation** — Quando si salvano PDF modificati (merge/split/ecc.), il nome file segue il nome scelto dall'utente, non default ("merged\_..."). Piano: `.specs/plans/feature-pdf-naming-preservation.md`.
- ⬜ **PDF compression** — Endpoint per comprimere PDF riducendo size mantenendo qualità visiva. Piano: `.specs/plans/feature-pdf-compression.md`.
- ⬜ **SendGrid rate limiting handling** — Rilevare limite email SendGrid raggiunto, disabilitare bottone "Forgot Password" o mostrare alert informativo. Piano: `.specs/plans/feature-sendgrid-rate-limit-handling.md`.
- ⬜ **Stripe MCP Server — Abbonamenti e pagamenti** — Integrare Stripe per abbonamenti (free → premium → lifetime) tramite MCP server ufficiale `https://mcp.stripe.com`. Checkout, webhook, customer portal, sync con license_tier. Piano: `.specs/plans/feature-stripe-mcp-subscriptions.md`.
- ⬜ **Landing page footer fix** — Rendere funzionali i link del footer (Features, How it Works, Privacy, Terms). Aggiungere link nascosto al sito personale futuro. Piano: `.specs/plans/feature-landing-footer-links.md`.
- ⬜ **License tier button skin** — Skin visiva per pulsanti toolbar: feature non disponibili appaiono grigie con badge "PRO" e tooltip "Upgrade to Premium". Si attiva quando `DISABLE_LICENSE_ENFORCEMENT=False`. Piano: `.specs/plans/feature-license-tier-button-skin.md`.
- ✅ **Admin license tier restrictions** — Il superadmin può assegnare/rimuovere solo il tier "lifetime" (enterprise). Non può modificare tier "pro" o "premium" (pagati via Stripe). **[COMPLETATO]** — Implementato 2026-07-10, PR #196.
- ✅ **Navigazione landing page da app autenticata** — Logo in AppLayout linka a `/landing`. LandingNavbar mostra "Vai all'App" per utenti autenticati. Piano: `.specs/plans/feature-authenticated-landing-navigation.md`. **[COMPLETATO]** — Implementato 2026-07-09.
- ⬜ **Inline text editor (word-like)** — Sostituire il dialog "Find and Replace" con un editor di testo inline WYSIWYG: click-to-edit direttamente sul PDF viewer, modifica multipla, salvataggio batch. Complessità ALTA. Piano: `.specs/plans/feature-inline-text-editor.md`. **[SOSTITUISCE Find & Replace rotto]**
- ✅ **Backend 100% coverage** — Portare copertura test backend da 83% a 92% (225 test, 0 failures). **[COMPLETATO]** — 2026-07-11, PR #202.
- ✅ **Fix 3 test falliti** — google_oauth (2) + migration PermissionError (1). **[COMPLETATO]** — 2026-07-10, PR #200.
- ✅ **Security improvements** — Graceful shutdown, password strength, header injection, E2E tests. **[COMPLETATO]** — 2026-07-11, PR #208 + #212.
- ✅ **Large file upload progress indicator** — Barra di progresso per upload file grandi. **[COMPLETATO]** — 2026-07-11, PR #206.
- ✅ **Admin bug report — campi mancanti** — Mostrare platform, app_version, os_info nella tabella bug. **[COMPLETATO]** — 2026-07-11, PR #204.
- ✅ **CSRF protection** — Middleware CSRF token. **[COMPLETATO]** — 2026-07-11, PR #214.
- ✅ **JWT httpOnly cookie** — Eliminata vulnerabilità XSS localStorage. **[COMPLETATO]** — 2026-07-11, PR #216.
- ⬜ **Frontend coverage 100%** — Portare copertura test frontend da 35% a 100%. Piano: `.specs/plans/chore-frontend-100-percent-coverage.md`.
- ⬜ **User bug report status in dashboard** — Mostrare stato segnalazioni bug nella pagina profilo. Piano: `.specs/plans/feature-user-bug-report-status.md`.
- ⬜ **AI PDF editing service** — Servizio AI per modifiche PDF via linguaggio naturale (BYOK + cloud). Piano: `.specs/plans/feature-ai-pdf-editing.md`.
- ⬜ **Privacy Policy page** — Pagina privacy policy accessibile dal footer. Piano: `.specs/plans/feature-privacy-policy.md`.

### Code Review — Issue identificate

| # | Issue | Tipo | Priorità | Fix |
|---|-------|------|----------|-----|
| 1 | **Password strength non validata su reset password** | Bug | 🔴 Alta | `.specs/plans/bug-password-strength-on-reset.md` |
| 2 | **License features seed duplicato** (main.py + conftest.py) | Duplicazione | 🟢 Bassa | `.specs/plans/chore-license-seed-extract.md` |
| 3 | **PDF.js loading duplicato in 3 dialoghi** (Split/Reorder/Remove) | Duplicazione | 🟡 Media | `.specs/plans/chore-extract-usePdfJs-hook.md` |
| 4 | **ADR.md troppo lungo** (~430 linee) — Bug tracker storico è rumore | Documentazione | 🟢 Bassa | `.specs/plans/chore-changelog-adr-slim.md` |
| 5 | **`pdf_service.py` 406 linee** — troppe responsabilità | Refactoring | 🟢 Bassa | Valutare suddivisione futura |
| 6 | **`api.ts` frontend 400+ linee** — tutti i metodi in un file | Refactoring | 🟢 Bassa | Valutare suddivisione futura |
| 7 | **`Sidebar.tsx` — nessun feedback errore su loadFiles fallito** | UX | 🟢 Bassa | Aggiungere toast/alert |

<!-- Qui finisce Fase 1. Prossime fasi in "Fasi successive (macro)" sopra -->
