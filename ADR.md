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
| Provider i18n custom                                | next-intl                  | next-intl installato ma non utilizzato; provider custom attivo                                                                                                                                                           |
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
- Max 10 snapshot undo/redo per sessione
- Dark mode con persistenza (localStorage + system preference fallback)

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

### In corso 🔄

_nessuno_

### Da risolvere ⏳

1. [ ] **Validazione endpoint `/pdfs/import`** — Accetta TXT/PNG/JPG/GIF/BMP con validazione minima

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

### Feature minori da implementare (in ordine)

1. [ ] **Sostituzione I18nProvider custom con next-intl** — next-intl già installato ma inutilizzato
2. [ ] **API upload protette da autenticazione** — Decisione e implementazione protezione endpoint PDF con JWT
3. [ ] **PDF protetti da password** — Rilevamento automatico, modale richiesta password, gestione sessione
4. [ ] **Undo/Redo per modifiche PDF** — Cronologia snapshot lato server con pulsanti toolbar
