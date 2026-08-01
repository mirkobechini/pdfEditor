# Architecture Decision Record

**Progetto:** PdfEditor
**Data:** 2026-06-25 (ultimo aggiornamento 2026-08-01)
**Versioni ADR incluse:** v0.1.24 → v0.1.33 (10 release)
**Autore:** Mirko Bechini

## Decisione

Applicazione cross-platform per la modifica e gestione di file PDF, con funzionalità di visualizzazione, annotazione, conversione, modifica testo e manipolazione avanzata. Architettura modulare che copre web (Next.js), desktop (Tauri v2), mobile (React Native) e backend (FastAPI).

## Contesto

Creare un'applicazione PDF editor che funzioni offline come priorità (desktop), con estensione al web e successivamente al mobile. L'utente target è un utente tecnico che necessita di editing PDF avanzato senza dipendere da servizi cloud a pagamento. Il progetto è open source (licenza AGPL compatibile per PyMuPDF).

---

## 1. Backend (FastAPI) — comune a web, desktop e mobile

| Scelta | Alternativa | Motivo |
|--------|-------------|--------|
| FastAPI (Python) | Node.js, Go | PyMuPDF per elaborazione PDF nativa. Team Python. |
| PyMuPDF (fitz) | pdf-lib, pikepdf | Supporto nativo modifica testo, metadati, tagging accessibilità. |
| UUID come PK | autoincrement integer | Sync bidirezionale SQLite ↔ PostgreSQL senza conflitti. |
| SQLAlchemy 2.0 | Django ORM, raw SQL | Async support, migration via Alembic, già noto al team. |
| Alembic per migration | — | Standard de facto per SQLAlchemy. |
| JWT (bcrypt) + httpOnly cookie | Session-based | Stateless, compatibile con mobile e desktop offline. |
| google-auth-library per SSO Google | PyJWT + requests manuali | google-auth ufficiale: cache automatica chiavi, validazione Google, key rotation gestita. PR #388. |
| SendGrid API HTTP (requests diretto) | SMTP via libreria SendGrid | Render free tier blocca porta 587 in uscita. Nessuna dipendenza extra. |
| Standard error codes API (codice + dettaglio) | Solo `str(e)` plain | Ogni HTTPException usa `error_response(code, detail)`. Frontend mappa in chiave i18n tramite `mapError()`. UX produzione, supporto IT/EN. |
| Neon PostgreSQL (serverless) | Render PostgreSQL free | Render ha discontinuato il free tier PostgreSQL. Neon offre free tier permanente (0.5GB storage, 100h compute/mese). |
| Cloudflare R2 per storage PDF | Disco locale Render | Già implementato in `s3_storage.py`. Gratis 10GB storage, zero egress cost. |
| Autenticazione obbligatoria per ogni operazione PDF | Endpoint /pdfs/* pubblici | Ogni PDF è associato a un utente (user_id). Anche le operazioni base richiedono login. |
| Tagged PDF in output | PDF non strutturati | Accessibilità screen reader (obbligo AGPL indiretto). |
| API backend per merge/split/riordino | pdf-lib lato client | pdf-lib sostituito da API backend per affidabilità — refactoring PR #72. |
| Provider i18n custom → next-intl client-side | next-intl con middleware | next-intl già installato ma inutilizzato. Rifattorizzato in PR #94: NextIntlClientProvider client-side (compatibile con output: 'export'). |
| pytest per test backend | unittest | Standard di fatto per FastAPI. Coverage 94%. |

---

## 2. Webapp Frontend (Next.js)

| Scelta | Alternativa | Motivo |
|--------|-------------|--------|
| React 19 + TailwindCSS v4 | Vue, Svelte, Angular | UI condivisa tra web, desktop e mobile. Ecosistema React maturo. |
| Next.js 16 (app router) con `output: 'export'` | SSR/API Routes | Compatibilità Tauri (static export). API tutte su FastAPI. |
| PDF.js (Mozilla) per viewer | pdf-lib, PSPDFKit | Viewer PDF lato client open source, standard de facto. |
| vitest + jsdom + @testing-library/react | Jest, Cypress | Test frontend. Coverage ~75%. |
| Dark mode con persistenza | localStorage + system preference fallback | — |

---

## 3. Desktop (Tauri v2)

### Architettura generale

| Scelta | Alternativa | Motivo |
|--------|-------------|--------|
| Tauri v2 | Electron | Binario più piccolo (~5MB vs ~150MB), Rust per performance, security. |
| Frontend desktop separato (`desktop/frontend/`) | Overlay su frontend unico | Sostituisce il sistema di overlay. Zero `isTauri()` conditionali, landing page assente su desktop, manutenzione indipendente. |
| Cartella `desktop/` dedicata | Nella root | Separazione netta: `backend/`, `frontend/`, `desktop/`. |
| Rust target MSVC (Windows) | MinGW/GNU | Tauri richiede MSVC toolchain + Microsoft C++ Build Tools. |

### Sidecar (FastAPI locale)

| Scelta | Alternativa | Motivo |
|--------|-------------|--------|
| FastAPI sidecar con PyInstaller | Backend remoto sempre | Funzionamento offline desktop (Fase 1c). |
| PyMuPDF con PyInstaller | pdf-lib JS, embedded Python | PyInstaller con `--hidden-import=fitz`. Fallback: embedded Python. |
| Porta 7723 | 8000 (default) | Hardcoded in Rust, configurabile via SIDECAR_PORT env. |
| `.env.desktop` con solo campi del modello | Variabili extra | pydantic_settings v2 con `extra='forbid'`. Rimossi `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `SIDECAR_PORT`, `STORAGE_LOCAL_PATH`. |
| SECRET_KEY auto-generata | Hardcoded nel .env | Se vuota, config.py genera chiave casuale (safe per localhost). Obbligatoria in cloud. |
| CORS per Tauri webview | Solo localhost:3000 | Aggiunti origins `tauri://localhost` e `https://tauri.localhost`. |
| `--strip` su PyInstaller | Binario con debug symbols | Riduce dimensione artifact del 20-30% (PR #547). |
| UPX compression (O1) | Nessuna compressione | UPX installato in CI. Sidecar 60MB → ~20MB (PR #549). |
| MEI temp dir cleanup | — | Pulizia directory `_MEI*` orfane in `%TEMP%` prima di spawnare (PR #558). |

### Auth e dati

| Scelta | Alternativa | Motivo |
|--------|-------------|--------|
| Auth offline via Tauri store plugin | Solo online | JWT cached in auth.json. App funzionante offline. |
| Guest access | Solo registrazione | Utenti guest temporanei (is_guest flag). Convertibili in account completo. |
| Cloud sync (Fase 3) integrata | Sync posticipato | UUID PK già implementati. Endpoint sync backend + UI sync frontend. |
| Database offline: SQLite | PostgreSQL locale | Zero configurazione, file-based, perfetto per uso offline. |

### UI e UX

| Scelta | Alternativa | Motivo |
|--------|-------------|--------|
| Dialog nativo con `tauri-plugin-dialog` | `prompt()` browser | Sostituito `prompt()` nel wizard con `open({ directory: true })`. Fallback a prompt preservato per browser. |
| Startup screen con 3 step | Redirect diretto al login | Messaggi di errore specifici (tempo scaduto, connessione rifiutata). Pulsante Riprova. |
| System tray su close | Uscita completa | Click X nasconde in tray. Click icona riapre. Menu "Mostra" / "Esci". Sidecar NON killato finché non si clicca "Esci". Richiede `features = ["tray-icon"]`. |
| Single-instance plugin | Nessuno | Impedisce seconda istanza (e tray duplicati). Seconda istanza porta in primo piano la finestra esistente (PR #558). |
| Auto-update via GitHub Releases | Download manuale | Tauri updater built-in. |

### Build e CI/CD

| Scelta | Alternativa | Motivo |
|--------|-------------|--------|
| `@tauri-apps/cli` via npm (devDependency) | `cargo install tauri-cli` | ~5-12 min risparmiati. Funziona su ARM macOS. (PR #531) |
| `npm --prefix ../frontend exec tauri build` | `npx tauri build` | npx non trova il binario in `desktop/frontend/node_modules/` da `desktop/src-tauri/`. (PR #539) |
| Preflight 8/8 checks | Solo build CI | 8 check in ~3 min invece di 25 min di CI. (PR #535, #537) |
| Bump versione automatico centralizzato | Bump manuale | `scripts/bump-version.js` aggiorna tutti i 9 file. (PR #530) |
| Frontend build parallelo (O3) | Frontend buildato 3 volte | Job separato `build-frontend` su ubuntu-latest. (PR #553) |
| PyInstaller cache pip (O2) | PyInstaller reinstallato | `pip install pyinstaller` spostato nel backend deps step. (PR #551) |
| Rust strip profile (O4) | Binario con debug symbols | `strip = true` in `[profile.release]`. (PR #557) |
| NSIS installer hooks | — | Macro `NSIS_HOOK_PREINSTALL`/`PREUNINSTALL` killano processi prima di install/disinstall. |
| Build locale obbligatoria prima del tag | Solo CI GitHub | AGENT_FLOW: build locale → test → solo se OK → tag GitHub. |

---

## 4. Mobile (React Native) — futuro, Fase 4

| Scelta | Alternativa | Motivo |
|--------|-------------|--------|
| React Native / Expo bare workflow | Flutter, Kotlin Multiplatform | Logica React condivisa con web/desktop. |
| PDF.js via WebView | PDF nativo | Riutilizzo viewer esistente. |
| SSO Google login | — | Già implementato su web/desktop. |
| Phone scanner → PDF | — | Feature pianificata. Vedi `.specs/plans/feature-phone-scanner.md`. |

---

## Decisioni deprecate

| Scelta deprecata | Sostituita da | Data |
|------------------|---------------|------|
| Desktop: stessa UI del web (overlay) | Frontend desktop separato | 2026-07-27 |
| Desktop: frontend-overlay per componenti nativi | Frontend desktop separato | 2026-07-28 |
| Desktop: startup screen con 3 step di init (redirect immediato) | Startup screen con 3 step (con errori) | 2026-07-29 → 2026-07-30 |

---

## Vincoli

- Licenza AGPL PyMuPDF — compatibile con open source. Se futuro closed source, necessaria licenza commerciale o alternativa
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

| Fase | Descrizione | Stato |
|------|-------------|:-----:|
| **Fase 1c — Desktop app (Tauri v2)** | Setup Tauri + Next.js build statica. PyInstaller per bundle FastAPI. SQLite locale. Installer per Windows/macOS/Linux. | ✅ Completata (v0.1.20) |
| **Fase 2 — Web app su cloud** | Deploy FastAPI su Render. PostgreSQL cloud. Upload file su S3 (Cloudflare R2). Next.js static export. | ✅ Completata (2026-07-10) |
| **Fase 3 — Cloud sync** | Sync bidirezionale SQLite ↔ PostgreSQL (UUID + timestamp). Risoluzione conflitti. | ✅ Completata |
| **Fase 4 — Mobile app (React Native)** | Setup React Native (Expo bare workflow). Logica React condivisa. UI nativa. Store deployment. | ⬜ Futuro |

> 📋 **Storico completo dei fix:** Vedi [`CHANGELOG.md`](./CHANGELOG.md).
> 🐞 **Bug aperti e debito tecnico:** Vedi [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md).
> 📖 **Lezioni apprese:** Vedi [`LESSONS_LEARNED.md`](./LESSONS_LEARNED.md).
> 📝 **Feature pianificate:** Vedi `.specs/plans/`.
| --------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | -------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Next.js con `output: 'export'`                                  | SSR/API Routes              | Compatibilità Tauri (static export), API tutte su FastAPI                                                                                                                                                                                                                                                                                                                                              |
| UUID come PK                                                    | autoincrement integer       | Sync bidirezionale SQLite ↔ PostgreSQL senza conflitti                                                                                                                                                                                                                                                                                                                                                 |
| PyMuPDF                                                         | pdf-lib, pikepdf            | Supporto nativo modifica testo, metadati, tagging accessibilità                                                                                                                                                                                                                                                                                                                                        |
| Autenticazione obbligatoria per ogni operazione PDF             | Endpoint /pdfs/\* pubblici  | Ogni PDF è associato a un utente (user_id). Anche le operazioni base (upload/list/download/delete) richiedono login, perché senza user_id non esiste ownership. Il free tier è un utente registrato a tutti gli effetti.                                                                                                                                                                               |
| google-auth-library per SSO Google                              | PyJWT + requests manuali    | google-auth ufficiale: cache automatica chiavi, validazione Google, key rotation gestita. PR #388.                                                                                                                                                                                                                                                                                                     |
| Provider i18n custom → next-intl client-side                    | next-intl con middleware    | next-intl già installato ma inutilizzato. Rifattorizzato in PR #94: NextIntlClientProvider client-side (compatibile con output: 'export').                                                                                                                                                                                                                                                             |
| FastAPI sidecar con PyInstaller                                 | Backend remoto sempre       | Funzionamento offline desktop (Fase 1c)                                                                                                                                                                                                                                                                                                                                                                |
| API backend per merge/split/riordino                            | pdf-lib lato client         | pdf-lib sostituito da API backend per affidabilità — refactoring PR #72. PyMuPDF server-side.                                                                                                                                                                                                                                                                                                          |
| Tagged PDF in output                                            | PDF non strutturati         | Accessibilità screen reader (obbligo AGPL indiretto)                                                                                                                                                                                                                                                                                                                                                   |
| SendGrid API HTTP invece di SMTP                                | SMTP via libreria SendGrid  | Render free tier blocca la porta 587 in uscita. Usata API HTTP v3 direttamente con `requests` — nessuna dipendenza extra.                                                                                                                                                                                                                                                                              |
| Standard error codes API (codice + dettaglio)                   | Solo `str(e)` plain         | Ogni HTTPException backend usa `error_response(code, detail)` con codice stabile (es. `INVALID_CREDENTIALS`). Il frontend mappa ogni codice in una chiave i18n tramite `mapError()`, eliminando `err.message` raw in UI. Motivo: UX produzione, supporto IT/EN, debug facilitato.                                                                                                                      |
| Neon PostgreSQL (serverless)                                    | Render PostgreSQL free      | Render ha discontinuato il free tier PostgreSQL. Neon offre PostgreSQL serverless con free tier permanente (0.5GB storage, 100h compute/mese con auto-suspend). Connection pooling built-in, stesso driver psycopg.                                                                                                                                                                                    |
| Cloudflare R2 per storage PDF                                   | Disco locale Render         | Già implementato in `s3_storage.py` + `storage.py`. Gratis 10GB storage, zero egress cost. Configurato con `STORAGE_BACKEND=s3`.                                                                                                                                                                                                                                                                       |
| **Desktop: stessa UI del web** (deprecato)                      | UI desktop nativa           | `output: 'export'` già configurato; webview Tauri carica gli stessi asset statici. Si adattano solo API calls (da Render a localhost) e si aggiungono Tauri API per file dialogs nativi. **DEPRECATO dal 2026-07-27** — vedi nuova decisione "Frontend desktop separato" sotto.                                                                                                                        |
| **Frontend desktop separato**                                   | Overlay su frontend unico   | Sostituisce il sistema di overlay (`desktop/frontend-overlay/`). Il desktop ha il suo `desktop/frontend/` Next.js indipendente, con pagine e layout basati sui design "PDF Harmony Suite" su Lovable. Il `release.yml` builda `desktop/frontend/` invece di `frontend/`. Vantaggi: zero `isTauri()` conditionali, landing page assente su desktop, manutenzione indipendente, layout personalizzabile. |
| **Desktop: Rust target MSVC**                                   | MinGW/GNU                   | Su Windows, Tauri richiede MSVC toolchain (`x86_64-pc-windows-msvc`) + Microsoft C++ Build Tools (workload "Desktop development with C++").                                                                                                                                                                                                                                                            |
| **Desktop: auth offline via Tauri store plugin**                | Solo online                 | JWT cached in Tauri store plugin (auth.json). App funzionante offline con sync quando torna online.                                                                                                                                                                                                                                                                                                    |
| **Desktop: cloud sync (Fase 3) integrata**                      | Sync posticipato            | UUID PK già implementati. La Fase 3 viene integrata direttamente nella Desktop App: endpoint sync backend + UI sync frontend.                                                                                                                                                                                                                                                                          |
| **Desktop: auto-update via GitHub Releases**                    | Download manuale            | Tauri updater built-in: controlla GitHub Releases, scarica e installa in automatico.                                                                                                                                                                                                                                                                                                                   |
| **Desktop: PyMuPDF con PyInstaller**                            | pdf-lib JS, embedded Python | Si tenta PyInstaller con `--hidden-import=fitz`. Fallback: embedded Python (embeddable zip) se i binding C danno problemi.                                                                                                                                                                                                                                                                             |
| **Desktop: cartella `desktop/` dedicata**                       | Nella root                  | Separazione netta: `backend/`, `frontend/`, `desktop/`. Il codice Tauri (Rust, sidecar, icons, updater) risiede in `desktop/src-tauri/`.                                                                                                                                                                                                                                                               |
| **Desktop: frontend-overlay per componenti nativi** (deprecato) | Modificare i file frontend  | **DEPRECATO dal 2026-07-28**. Inizialmente `desktop/frontend-overlay/` veniva copiato nel frontend web a build-time. Con il frontend desktop separato, il build Tauri punta direttamente a `desktop/frontend/out` e l'approccio overlay non è più il percorso principale.                                                                                                                              |
| **Desktop: guest access**                                       | Solo registrazione          | Utenti guest temporanei (is_guest flag) per uso desktop senza login. Convertibili in account completo.                                                                                                                                                                                                                                                                                                 |
| **Desktop: SECRET_KEY auto-generata**                           | Hardcoded nel .env          | Se vuota, config.py genera una chiave casuale (safe per localhost). Obbligatoria in cloud.                                                                                                                                                                                                                                                                                                             |
| **Desktop: CORS per Tauri webview**                             | Solo localhost:3000         | Aggiunti origins tauri://localhost e https://tauri.localhost per permettere richieste webview → sidecar.                                                                                                                                                                                                                                                                                               |     | **Desktop: dialog nativo con tauri-plugin-dialog** | prompt() browser         | Sostituito `prompt()` nel wizard con `open({ directory: true })` per selezionare cartella di lavoro. Fallback a prompt() preservato per browser.                                                                                                             |
| **Desktop: startup screen con 3 step di init (deprecato)**      | Redirect diretto al login   | **DEPRECATO dal 2026-07-29 (PR #517).** Ora `/startup` reindirizza istantaneamente a `/wizard` o `/login`. Il login ha un health check non bloccante con warning giallo. Motivo: il sidecar PyInstaller impiega 20-30s al primo avvio — bloccare l'utente sulla startup screen era una UX peggiore di lasciarlo interagire subito.                                                                     |
| **Desktop: startup rapida (istanza) (deprecato)**               | Health check bloccante      | **DEPRECATO dal 2026-07-30 (PR #525).** La startup screen tornata alla versione con 3 step (backend, database, API) con messaggi di errore specifici: tempo scaduto, connessione rifiutata, ecc. La versione "redirect immediato" non dava feedback all'utente e impediva la diagnostica quando il sidecar non partiva. Miglior UX percepita.                                                          |     | **CI release: caching Rust, npm, cargo-binstall**  | Compilazione da sorgente | `Swatinem/rust-cache` per cache Rust, `actions/cache` per npm, `cargo binstall tauri-cli` (binario precompilato) invece di `cargo install` (da sorgente). Riduce build da ~25min a <10min.                                                                   |
| **Desktop: system tray su close (pianificato)**                 | Uscita completa             | **IMPLEMENTATO dal 2026-07-30 (PR #533).** Click X nasconde in tray. Click icona riapre finestra. Click destro: menu "Mostra PdfEditor" / "Esci". Sidecar NON killato finché non si clicca "Esci". Richiede `features = ["tray-icon"]` su `tauri` in Cargo.toml. TrayIconBuilder built-in Tauri v2.                                                                                                    |     | **CI release: preflight job prima della build**    | Build diretta            | Job `preflight` in release.yml esegue `npm ci`, `next build`, import Python prima di avviare la build Tauri (25min). Se fallisce, si risparmia il tempo della build. Script locale `desktop/preflight.sh` / `.ps1` eseguibile anche in locale prima del tag. |
| **CI release: @tauri-apps/cli via npm invece di cargo install** | `cargo install tauri-cli`   | **IMPLEMENTATO dal 2026-07-30 (PR #531).** `@tauri-apps/cli` come devDependency npm (~5-7 min risparmiati per build, ~10-15 min su ARM). Su macOS ARM (che non ha binari precompilati per cargo-binstall) il guadagno è ancora maggiore.                                                                                                                                                               |
| **CI release: build path con npm --prefix**                       | `npx tauri build`          | **IMPLEMENTATO dal 2026-07-31 (PR #539).** `npx tauri build` da `desktop/src-tauri/` non funziona perché `@tauri-apps/cli` è in `desktop/frontend/node_modules/`. Sostituito con `npm --prefix ../frontend exec tauri build -- --ci` — `--prefix` punta alla directory con il binario, ma CWD resta `desktop/src-tauri/` per trovare `tauri.conf.json`. Aggiunte anche: npm cache, Rust cache (`swatinem/rust-cache@v2`), target `x86_64-apple-darwin` per Intel macOS, e `files:` espliciti nella release.                                                                                                       |
| **Preflight 8/8 checks**                                        | Preflight base (3 checks)   | **IMPLEMENTATO dal 2026-07-30 (PR #535, #537).** 8 checks: npm ci, next build, pip install, sidecar imports, Tauri CLI check (`npm run tauri -- --version`), cargo check (Rust compilation), version alignment, i18n messages. Totale ~3 minuti.                                                                                                                                                       |
| **Bump versione automatico centralizzato**                      | Bump manuale file per file  | **IMPLEMENTATO dal 2026-07-30 (PR #530).** `scripts/bump-version.js` aggiorna tutti i 9 file con versione in un colpo solo. Inclusi nel preflight check.                                                                                                                                                                                                                                               |
| **Single-instance plugin** | Nessuno | **IMPLEMENTATO dal 2026-07-31.** `tauri-plugin-single-instance` impedisce l'apertura di una seconda istanza dell'app (e quindi la creazione di tray icon duplicati). La seconda istanza porta in primo piano la finestra esistente. In `start_sidecar`, controllo TCP sulla porta 7723 prima di spawnare per prevenire processi sidecar orfani duplicati. |
| **Build: beforeBuildCommand rimosso** | `beforeBuildCommand` esegue next build dentro tauri build | **IMPLEMENTATO dal 2026-07-31 (PR #546).** Rimosso `beforeBuildCommand` da `tauri.conf.json`. Il frontend viene buildato in CI come step esplicito PRIMA di `tauri build`, permettendo parallelismo con sidecar build. |
| **Sidecar: strip symbols** | Binario con debug symbols | **IMPLEMENTATO dal 2026-07-31 (PR #547).** Aggiunto flag `--strip` a PyInstaller per rimuovere simboli di debug dai .so/.dll/.pyd bundled. Riduce dimensione artifact del 20-30%. |
| **Startup: ECONNREFUSED non bloccante** | Errore immediato su ECONNREFUSED | **IMPLEMENTATO dal 2026-07-31 (PR #545).** Il `catch` in `startup/page.tsx` non mostra più errore su `ECONNREFUSED`. Continua a ritentare per tutti i 60 tentativi. L'errore appare solo se TUTTI falliscono. |
| **UPX compression sidecar (O1)** | Binario PyInstaller non compresso | **IMPLEMENTATO dal 2026-07-31 (PR #549).** UPX installato in CI prima di build-sidecar. PyInstaller lo rileva automaticamente sul PATH e comprime i .so/.dll/.pyd. Sidecar 60MB → ~20MB. |
| **PyInstaller cache pip (O2)** | PyInstaller reinstallato su ogni build | **IMPLEMENTATO dal 2026-07-31 (PR #551).** `pip install pyinstaller` spostato nello step backend deps, dove viene cacheato dal pip cache. |
| **Frontend build parallelo (O3)** | Frontend buildato 3 volte (una per OS) | **IMPLEMENTATO dal 2026-07-31 (PR #553).** Nuovo job `build-frontend` su ubuntu-latest. Il job `build` scarica l'artifact. Frontend buildato una volta sola. |
| **Rust strip profile (O4)** | Binario Rust con simboli di debug | **IMPLEMENTATO dal 2026-07-31 (PR #557).** Aggiunto `strip = true` a `[profile.release]` in Cargo.toml. Binario Rust 10-20% più piccolo. |
| **MEI temp dir cleanup (Python DLL fix)** | Popup Python DLL error su startup | **IMPLEMENTATO dal 2026-07-31 (PR #558).** Nuova funzione `cleanup_mei_temp_dirs()` in Rust che pulisce le directory `_MEI*` orfane in `%TEMP%` prima di spawnare il sidecar. Previene il popup "Failed to load Python DLL" causato da kill forzato del sidecar. |
| **Phone scanner (futuro)** | — | **PIANIFICATO.** Scan da fotocamera telefono → PDF automatico. Vedi `.specs/plans/feature-phone-scanner.md`. |

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

| Fase                                   | Descrizione                                                                                                                                                                                                                                                                                                                                         | Stato                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **Fase 1c — Desktop app (Tauri v2)**   | Setup Tauri + Next.js build statica. PyInstaller per bundle FastAPI in eseguibile. Sidecar: avvio FastAPI locale all'avvio. SQLite locale per dati offline. Installer per Windows (primario), macOS/Linux (secondario). Fixati: pydantic validation error su .env.desktop, dialog nativo cartella lavoro, startup screen, health check ottimizzato. | ✅ Completata (v0.1.20)                      |
| **Fase 2 — Web app su cloud**          | Deploy FastAPI su Render. PostgreSQL cloud. Upload file su S3 (Cloudflare R2). Next.js static export.                                                                                                                                                                                                                                               | ✅ Completata (2026-07-10)                   |
| **Fase 3 — Cloud sync**                | Sync bidirezionale SQLite ↔ PostgreSQL (UUID + timestamp). Risoluzione conflitti (lock ottimistico). Modalità offline/online seamless.                                                                                                                                                                                                              | ✅ Completata (come parte della desktop app) |
| **Fase 4 — Mobile app (React Native)** | Setup React Native (Expo bare workflow). Logica React condivisa (API client, hooks auth, utility PDF). UI nativa. Viewer PDF.js via WebView. SSO Google login. Store deployment (Google Play / Apple).                                                                                                                                              | ⬜ Futuro                                    |

> 📋 **Storico completo dei fix:** Vedi [`CHANGELOG.md`](./CHANGELOG.md) per l'elenco di tutte le PR e issue.
> 🐞 **Bug aperti e debito tecnico:** Vedi [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md).
> 📖 **Lezioni apprese:** Vedi [`LESSONS_LEARNED.md`](./LESSONS_LEARNED.md).
> 📝 **Feature pianificate:** Vedi `.specs/plans/` per i dettagli delle feature future.
