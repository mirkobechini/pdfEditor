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
- **Database cloud:** PostgreSQL (previsto per Fase 2-3)
- **ORM:** SQLAlchemy 2.0
- **Auth:** JWT (bcrypt) + SSO Google (PyJWT + requests)
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
- Deploy cloud / PostgreSQL (Fase 2 — futuro)
- Cloud sync bidirezionale (Fase 3 — futuro)
- Mobile React Native (Fase 4 — futuro)
- Integrazione pagamenti Stripe/Lemon Squeezy (futura)
- SSO Apple / Samsung (previsto come bonus futuro)
- react-native-web (valutabile, non deciso)
- Annotazioni PDF (drawing, highlight, commenti — non menzionati)

## Bug tracker

### Risolti ✅

- [x] **Dark text illegibile in dark mode su login/register** — Aggiunte classi `dark:text-*` a h1, label, input. (PR #66, issue #65)
- [x] **Errori validazione Pydantic in inglese e raw JSON** — Custom exception handler backend + `ApiClient.extractError()` frontend. (PR #68, issue #67)
- [x] **Dark mode toggle + language selector non accessibili su login/register** — Estratto `HeaderControls` condiviso, aggiunto header a login/register. (PR #70, issue #69)
- [x] **Limite dimensione upload non enforceato** — Enforceato `MAX_UPLOAD_SIZE_MB=50` prima di leggere in RAM. (PR #86, issue #85)
- [x] **Lettura in memoria senza limiti** — Controllo dimensione prima di `file.file.read()`. (PR #86, issue #85)
- [x] **Limite pagine** — Aggiunto `MAX_PAGE_COUNT=500` enforceato in `PdfService.upload()`. (PR #86, issue #85)
- [x] **DeleteModal: chiavi i18n mancanti** — Aggiunta sezione `deleteModal` a `en.json` e `it.json`. (PR #102, issue #101)
- [x] **MISSING_MESSAGE: splitDialog.splitDialog.pageThumbnail** — Corretta chiave annidata in SplitDialog. (PR #102, issue #101)
- [x] **MISSING_MESSAGE: reorderDialog.reorderDialog.pageThumbnail** — Corretta chiave annidata in ReorderDialog. (PR #102, issue #101)
- [x] **MISSING_MESSAGE: removeDialog.removeDialog.pageThumbnail** — Corretta chiave annidata in RemoveDialog. (PR #102, issue #101)
- [x] **DeleteModal: sidebar.deleteFailed reference** — Corretto riferimento a chiave sbagliata. (PR #102, issue #101)
- [x] **DeleteModal posizionato nella sidebar invece che al centro** — Spostato DeleteModal da Sidebar a page.tsx (root level). (PR #104, issue #103)
- [x] **Cancellazione PDF fallita** — Aggiunto `refreshKey` alla Sidebar per ricaricare la lista dopo eliminazione. (PR #106, issue #105)
- [x] **Come impostare un account come admin** — Aggiunto endpoint `PUT /admin/users/{id}/admin` + toggle UI nella dashboard admin. (PR #108, issue #107)
- [x] **Messaggi errore non formattati** — Corretto doppio prefisso `"Error: "` e migliorato stile error container in Split/Merge/Reorder/Remove dialog. (PR #110, issue #109)
- [x] **Sostituire `<img>` con `<Image />` di next/image** — Sostituiti tutti i tag `<img>` con `<Image>` da `next/image` (con `unoptimized` per data URL) in DeleteModal, SplitDialog, ReorderDialog, RemoveDialog. (PR #112, issue #111)
- [x] **Split: linee di separazione tra pagine** — Ridisegnato SplitDialog con linee di separazione cliccabili tra le pagine invece di checkbox. (PR #114, issue #113)
- [x] **Super admin protetto da revoca** — Aggiunto `SUPER_ADMIN_EMAIL` in config, protetto repository/endpoint/CLI. Seed automatico allo startup. CLI tool `backend/cli.py`. (PR #116, issue #115)
- [x] **Bottone SSO Google in login/register** — Installato `@react-oauth/google`, aggiunto bottone Google a login e register pages, `GoogleLoginButton` componente condiviso. (PR #118, issue #117)
- [x] **Reset password con token temporaneo** — Aggiunti campi `reset_token`/`reset_token_expires` a User, endpoint `POST /auth/forgot-password` e `POST /auth/reset-password`, pagine `/forgot-password` e `/reset-password` frontend, test. (PR #120, issue #119)
- [x] **Test migration fix: test_downgrade_single_and_upgrade_again** — Fixato per controllare colonna `reset_token` anziché `is_password_protected`, dispose engine per evitare PermissionError Windows. (PR #122, issue #121)
- [x] **timeZone non configurata** — Aggiunto `timeZone: 'Europe/Rome'` a `NextIntlClientProvider` in `i18n.tsx`. (PR #124, issue #123)
- [x] **Admin bugfix: admin/users e admin/bugs wrapping** — Backend ora restituisce `{ items, total }` per admin/users e admin/bugs. Rimosso toggle admin button dalla UI. (PR #126, #128, #131)
- [x] **CLI per pulizia PDF orfani** — Aggiunto `cleanup-orphans` a `backend/cli.py`. (PR #130, issue #129)
- [x] **"Nothing to redo / Nothing to undo" — messaggi raw in console** — Gestiti silenziosamente i casi normali (nessun snapshot disponibile) in handleUndo/handleRedo. Test aggiunti. (PR #134, issue #133)
- [x] **PDF not found fallback nei dialoghi** — Creato PdfThumbnail.tsx con error handling graceful, refactoring DeleteModal → PdfThumbnail, error handling in SplitDialog/RemoveDialog/ReorderDialog. (PR #135, issue #136)
- [x] **DeleteModal: chiamata API duplicata** — `api.deletePdf()` chiamato 2 volte (DeleteModal + page.tsx). Rimosso duplicato. Fixato overflow modale. (PR #135, issue #136)
- [x] **Script tag in React component (layout.tsx)** — Sostituito `<script>` inline con `next/script` (strategy="beforeInteractive"). (commit su dev)
- [x] **Hydration mismatch GoogleLoginButton** — Dynamic import con `ssr: false` + mount solo client-side via useEffect. (commit su dev)
- [x] **Admin email hardcoded in config.py** — Spostato `SUPER_ADMIN_EMAIL` da hardcoded a `.env` via Pydantic Settings. Creato `.env.example`. (PR #136, issue #139)
- [x] **pdfPreview.ts senza test** — 7 unit test per renderFirstPageToDataUrl() con mock di PDF.js e Canvas. (PR #137, issue #137)
- [x] **Import file validation (/pdfs/import)** — Aggiunto size check (413) e MIME type validation per estensione. 16 test parametrizzati. (PR #140, issue #138)
- [x] **DeleteModal test obsoleti (PdfThumbnail)** — Aggiornati 3 test DeleteModal per match con PdfThumbnail (skeleton, alt text, fallback). (commit su dev)
- [x] **MAX_SNAPSHOTS hardcoded** — Spostato da costante in storage.py a `settings.MAX_SNAPSHOTS` (.env configurabile). (PR #138, issue #140)
- [x] **Expired reset token cleanup** — Lazy cleanup in `request_password_reset()`, nuovo metodo `delete_expired_tokens()` in user_repo.py. (PR #139, issue #141)
- [x] **Admin test broken (wrapped response)** — 5 test fixati per `{items, total}` response model. (PR #141, issue #145)
- [x] **Deprecation warnings (6→1)** — Fixati: Pydantic ConfigDict, Starlette HTTP status codes (413/422), SQLite datetime adapter. (PR #141, issue #145)

> **ℹ️ Setup richiesto:** Creare un OAuth Client ID su [Google Cloud Console](https://console.cloud.google.com/apis/credentials) e impostarlo in `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `frontend/.env.local` e `GOOGLE_CLIENT_ID` in `backend/.env`.

> **ℹ️ Reset password:** In sviluppo il token viene stampato nella console del backend. In produzione va configurato SMTP in `backend/.env`.

### In corso 🔄

_nessuno_

### Da risolvere/note ⏳

> **Nota:** Tutte le feature prioritarie Fase 1 completate. Prossima macro-fase: Fase 1c (Tauri v2).

> **Nota tecnica:** Il warning `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated; install httpx2 instead` non è fixabile dal nostro codice. La libreria `httpx2` non esiste ancora, è una futura release di starlette. Ignorare.

## Feature future pianificate

Le seguenti feature sono state pianificate e documentate in `.specs/plans/`. L'ordine di implementazione è definito dalla priorità indicata.

### Fasi successive (macro)

Dopo il completamento delle feature pendenti della Fase 1, il progetto prosegue con le seguenti macro-fasi:

- [ ] **Fase 1c — Desktop app (Tauri v2)** — Setup Tauri + Next.js build statica. PyInstaller per bundle FastAPI in eseguibile. Sidecar: avvio FastAPI locale all'avvio. SQLite locale per dati offline. Installer per Windows (primario), macOS/Linux (secondario).
- [ ] **Fase 2 — Web app su cloud** — Deploy FastAPI su Railway/Render/Fly.io. Deploy Next.js su Vercel. PostgreSQL cloud. Upload file su S3.
- [ ] **Fase 3 — Cloud sync** — Sync bidirezionale SQLite ↔ PostgreSQL (UUID + timestamp). Risoluzione conflitti (lock ottimistico). Modalità offline/online seamless.
- [ ] **Fase 4 — Mobile app (React Native)** — Setup React Native (Expo bare workflow). Logica React condivisa (API client, hooks auth, utility PDF). UI nativa. Viewer PDF.js via WebView. SSO Google login. Store deployment (Google Play / Apple).

### Feature minori completate

- [x] **Bug report button (frontend)** — Pulsante "Segnala bug" nell'header con dialog modale. Completata (PR #56, issue #55)
- [x] **UI autenticazione (login/register)** — Pagine `/login` e `/register` con form, AuthContext JWT, route protection, logout in header. Completata (PR #58, issue #57)
- [x] **Persistenza dark mode (localStorage)** — localStorage + system preference fallback + flash prevention. Completata (PR #60, issue #59)
- [x] **Enforcement licenze (backend)** — `verify_feature_access()` dependency per bloccare operazioni non consentite per tier. Completata (PR #62, issue #61)
- [x] **Allineamento modello BugReport al brief** — Aggiunti `platform`, `app_version`, `os_info`. Refactoring con repository pattern. Completata (PR #64, issue #63)
- [x] **Header controls su login/register** — `HeaderControls` condiviso con dark mode toggle e language selector sempre visibili. Completata (PR #70, issue #69)
- [x] **Header button order** — Riordinato header: `[☀️] [IT/EN] [Segnala Bug] [Nome] [Esci]`. Completata (PR #76, issue #75)
- [x] **Refactor dialoghi merge/split/reorder/remove** — Operano sul PDF corrente, usano API backend, scaricano il risultato come file nuovo. Completata (PR #72, issue #71)
- [x] **DeleteModal con anteprima PDF** — Modal di conferma eliminazione con anteprima prima pagina via PDF.js. Completata (PR #74, issue #73)
- [x] **Reorder miniature + drag & drop** — ReorderDialog con miniature PDF, drag & drop, pulsanti ▲/▼. Completata (PR #78, issue #77)
- [x] **Split miniature + selezione visuale** — SplitDialog con griglia miniature cliccabili + text input. Completata (PR #80, issue #79)
- [x] **Remove miniature + conferma** — RemoveDialog con miniature PDF, selezione visuale, modale conferma. Completata (PR #82, issue #81)
- [x] **Drag & drop viewer centrale** — PdfViewer accetta drop di PDF nello stato vuoto e overlay quando occupato. Completata (PR #84, issue #83)
- [x] **Enforce MAX_UPLOAD_SIZE_MB e MAX_PAGE_COUNT** — Limite 50MB e 500 pagine enforceati in upload. Completata (PR #86, issue #85)
- [x] **Dashboard admin** — Pagina `/admin` per gestione utenti, licenze e bug report. Completata (PR #88, issue #87)
- [x] **Auth endpoint PDF** — Aggiunto `user_id` a `PdfDocument`, protetti tutti gli endpoint `/pdfs/*` con JWT, filtro per utente corrente. Completata (PR #91, issue #89)
- [x] **Uniform license checking** — Estratta `check_feature_access()` condivisa in `deps.py`, rimossa duplicata `_check_license_for_format()` in `convert.py`. Completata (PR #92, issue #90)
- [x] **Sostituzione I18nProvider custom con next-intl** — Rimosso provider i18n custom, sostituito con `NextIntlClientProvider`. Tutti i componenti migrati a `useTranslations()`. Completata (PR #94, issue #93)
- [x] **PDF protetti da password** — Rilevamento automatico all'upload via PyMuPDF, endpoint `/pdfs/{id}/unlock`, cache password in memoria, modale UI in PdfViewer. Completata (PR #96, issue #95)
- [x] **Undo/Redo per modifiche PDF** — Snapshot prima di ogni modifica, max 10 per PDF, stack undo/redo separati, pulsanti ↩↪ con Ctrl+Z/Ctrl+Shift+Z. Completata (PR #98, issue #97)
- [x] **Dashboard admin: filtri e funzionalità** — Aggiunti filtro per tipo licenza, filtro per data creazione (da/a), ricerca per email, cambio licenza inline. Fix chiavi i18n bug report filter. (PR #132, issue #131)
- [x] **PDF not found fallback nei dialoghi** — `PdfThumbnail` componente riutilizzabile + fallback placeholder. (PR #135, issue #136)
- [x] **Unit test pdfPreview.ts** — 7 test per `renderFirstPageToDataUrl()` con mock PDF.js + Canvas. (PR #137, issue #137)
- [x] **Validazione /pdfs/import** — File size + MIME type validation. (PR #140, issue #138)
- [x] **Admin email in .env** — `SUPER_ADMIN_EMAIL` parametrizzato. (PR #136, issue #139)
- [x] **MAX_SNAPSHOTS configurabile** — Da hardcoded a settings (.env). (PR #138, issue #140)
- [x] **Expired token cleanup** — Lazy cleanup all'uso. (PR #139, issue #141)
- [x] **Google SSO al primo posto login** — Pulsante Google prima del form email/password. (commit su dev)

### Feature minori da implementare (in ordine)

<!-- Qui finisce Fase 1. Prossime fasi in "Fasi successive (macro)" sopra -->
