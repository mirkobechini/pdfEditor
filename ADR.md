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
| **Desktop: stessa UI del web** (deprecato)                   | UI desktop nativa           | `output: 'export'` già configurato; webview Tauri carica gli stessi asset statici. Si adattano solo API calls (da Render a localhost) e si aggiungono Tauri API per file dialogs nativi. **DEPRECATO dal 2026-07-27** — vedi nuova decisione "Frontend desktop separato" sotto. |
| **Frontend desktop separato**                                | Overlay su frontend unico   | Sostituisce il sistema di overlay (`desktop/frontend-overlay/`). Il desktop ha il suo `desktop/frontend/` Next.js indipendente, con pagine e layout basati sui design "PDF Harmony Suite" su Lovable. Il `release.yml` builda `desktop/frontend/` invece di `frontend/`. Vantaggi: zero `isTauri()` conditionali, landing page assente su desktop, manutenzione indipendente, layout personalizzabile. |
| **Desktop: Rust target MSVC**                       | MinGW/GNU                   | Su Windows, Tauri richiede MSVC toolchain (`x86_64-pc-windows-msvc`) + Microsoft C++ Build Tools (workload "Desktop development with C++").                                                                                                                                       |
| **Desktop: auth offline via Tauri store plugin**    | Solo online                 | JWT cached in Tauri store plugin (auth.json). App funzionante offline con sync quando torna online.                                                                                                                                                                               |
| **Desktop: cloud sync (Fase 3) integrata**          | Sync posticipato            | UUID PK già implementati. La Fase 3 viene integrata direttamente nella Desktop App: endpoint sync backend + UI sync frontend.                                                                                                                                                     |
| **Desktop: auto-update via GitHub Releases**        | Download manuale            | Tauri updater built-in: controlla GitHub Releases, scarica e installa in automatico.                                                                                                                                                                                              |
| **Desktop: PyMuPDF con PyInstaller**                | pdf-lib JS, embedded Python | Si tenta PyInstaller con `--hidden-import=fitz`. Fallback: embedded Python (embeddable zip) se i binding C danno problemi.                                                                                                                                                        |
| **Desktop: cartella `desktop/` dedicata**           | Nella root                  | Separazione netta: `backend/`, `frontend/`, `desktop/`. Il codice Tauri (Rust, sidecar, icons, updater) risiede in `desktop/src-tauri/`.                                                                                                                                          |
| **Desktop: frontend-overlay per componenti nativi** | Modificare i file frontend  | `desktop/frontend-overlay/` contiene componenti Tauri-specifici. A build time vengono copiati in `frontend/` prima di `npm run build`. Il frontend rimane pulito, i componenti desktop restano in `desktop/`.                                                                     |
| **Desktop: guest access**                           | Solo registrazione          | Utenti guest temporanei (is_guest flag) per uso desktop senza login. Convertibili in account completo.                                                                                                                                                                            |
| **Desktop: SECRET_KEY auto-generata**               | Hardcoded nel .env          | Se vuota, config.py genera una chiave casuale (safe per localhost). Obbligatoria in cloud.                                                                                                                                                                                        |
| **Desktop: CORS per Tauri webview**                 | Solo localhost:3000         | Aggiunti origins tauri://localhost e https://tauri.localhost per permettere richieste webview → sidecar.                                                                                                                                                                          |

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

## Cosa NON è in scope (per ora)

- Mobile React Native (Fase 4 — futuro)
- Integrazione pagamenti Stripe (pianificata — vedi `.specs/plans/feature-stripe-mcp-subscriptions.md`)
- SSO Apple / Samsung (previsto come bonus futuro)
- react-native-web (valutabile, non deciso)
- **Annotazioni PDF** (drawing, highlight, commenti) — non implementate

## Roadmap

### Fasi successive (macro)

| Fase                                   | Descrizione                                                                                                                                                                                                             | Stato                                        |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **Fase 1c — Desktop app (Tauri v2)**   | Setup Tauri + Next.js build statica. PyInstaller per bundle FastAPI in eseguibile. Sidecar: avvio FastAPI locale all'avvio. SQLite locale per dati offline. Installer per Windows (primario), macOS/Linux (secondario). | ✅ Completata (7/7 issue)                    |
| **Fase 2 — Web app su cloud**          | Deploy FastAPI su Render. PostgreSQL cloud. Upload file su S3 (Cloudflare R2). Next.js static export.                                                                                                                   | ✅ Completata (2026-07-10)                   |
| **Fase 3 — Cloud sync**                | Sync bidirezionale SQLite ↔ PostgreSQL (UUID + timestamp). Risoluzione conflitti (lock ottimistico). Modalità offline/online seamless.                                                                                  | ✅ Completata (come parte della desktop app) |
| **Fase 4 — Mobile app (React Native)** | Setup React Native (Expo bare workflow). Logica React condivisa (API client, hooks auth, utility PDF). UI nativa. Viewer PDF.js via WebView. SSO Google login. Store deployment (Google Play / Apple).                  | ⬜ Futuro                                    |

> 📋 **Storico completo dei fix:** Vedi [`CHANGELOG.md`](./CHANGELOG.md) per l'elenco di tutte le PR e issue.
> 🐞 **Bug aperti e debito tecnico:** Vedi [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md).
> 📖 **Lezioni apprese:** Vedi [`LESSONS_LEARNED.md`](./LESSONS_LEARNED.md).
> 📝 **Feature pianificate:** Vedi `.specs/plans/` per i dettagli delle feature future.
