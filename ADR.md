# Architecture Decision Record

**Progetto:** PdfEditor
**Data:** 2026-06-25 (ultimo aggiornamento 2026-08-23)
**Versioni ADR incluse:** v0.1.24 → v0.1.38 (13 release)
**Autore:** Mirko Bechini

## Decisione

Applicazione cross-platform per la modifica e gestione di file PDF, con funzionalità di visualizzazione, annotazione, conversione, modifica testo e manipolazione avanzata. Architettura modulare che copre web (Next.js), desktop (Tauri v2), **mobile (React Native — vedi [`mobile/ADR.md`](./mobile/ADR.md))** e backend (FastAPI).

> **Confronto feature tra piattaforme:** Vedi [`FEATURE_COMPARISON.md`](./FEATURE_COMPARISON.md)

## Contesto

Creare un'applicazione PDF editor che funzioni offline come priorità (desktop), con estensione al web e successivamente al mobile. L'utente target è un utente tecnico che necessita di editing PDF avanzato senza dipendere da servizi cloud a pagamento. Il progetto è open source (licenza AGPL compatibile per PyMuPDF).

---

## 1. Backend (FastAPI) — comune a web, desktop e mobile

| Scelta                                              | Alternativa                | Motivo                                                                                                                                     |
| --------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| FastAPI (Python)                                    | Node.js, Go                | PyMuPDF per elaborazione PDF nativa. Team Python.                                                                                          |
| PyMuPDF (fitz)                                      | pdf-lib, pikepdf           | Supporto nativo modifica testo, metadati, tagging accessibilità.                                                                           |
| UUID come PK                                        | autoincrement integer      | Sync bidirezionale SQLite ↔ PostgreSQL senza conflitti.                                                                                    |
| SQLAlchemy 2.0                                      | Django ORM, raw SQL        | Async support, migration via Alembic, già noto al team.                                                                                    |
| Alembic per migration                               | —                          | Standard de facto per SQLAlchemy.                                                                                                          |
| JWT (bcrypt) + httpOnly cookie                      | Session-based              | Stateless, compatibile con mobile e desktop offline.                                                                                       |
| google-auth-library per SSO Google                  | PyJWT + requests manuali   | google-auth ufficiale: cache automatica chiavi, validazione Google, key rotation gestita. PR #388.                                         |
| SendGrid API HTTP (requests diretto)                | SMTP via libreria SendGrid | Render free tier blocca porta 587 in uscita. Nessuna dipendenza extra.                                                                     |
| Standard error codes API (codice + dettaglio)       | Solo `str(e)` plain        | Ogni HTTPException usa `error_response(code, detail)`. Frontend mappa in chiave i18n tramite `mapError()`. UX produzione, supporto IT/EN.  |
| Neon PostgreSQL (serverless)                        | Render PostgreSQL free     | Render ha discontinuato il free tier PostgreSQL. Neon offre free tier permanente (0.5GB storage, 100h compute/mese).                       |
| Cloudflare R2 per storage PDF                       | Disco locale Render        | Già implementato in `s3_storage.py`. Gratis 10GB storage, zero egress cost.                                                                |
| Autenticazione obbligatoria per ogni operazione PDF | Endpoint /pdfs/\* pubblici | Ogni PDF è associato a un utente (user_id). Anche le operazioni base richiedono login.                                                     |
| Tagged PDF in output                                | PDF non strutturati        | Accessibilità screen reader (obbligo AGPL indiretto).                                                                                      |
| API backend per merge/split/riordino                | pdf-lib lato client        | pdf-lib sostituito da API backend per affidabilità — refactoring PR #72.                                                                   |
| Provider i18n custom → next-intl client-side        | next-intl con middleware   | next-intl già installato ma inutilizzato. Rifattorizzato in PR #94: NextIntlClientProvider client-side (compatibile con output: 'export'). |
| pytest per test backend                             | unittest                   | Standard di fatto per FastAPI. Coverage 94%.                                                                                               |

---

## 2. Webapp Frontend (Next.js)

| Scelta                                         | Alternativa                               | Motivo                                                                                                                                                          |
| ---------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React 19 + TailwindCSS v4                      | Vue, Svelte, Angular                      | UI condivisa tra web, desktop e mobile. Ecosistema React maturo.                                                                                                |
| Next.js 16 (app router) con `output: 'export'` | SSR/API Routes                            | Compatibilità Tauri (static export). API tutte su FastAPI.                                                                                                      |
| PDF.js (Mozilla) per viewer                    | pdf-lib, PSPDFKit                         | Viewer PDF lato client open source, standard de facto.                                                                                                          |
| vitest + jsdom + @testing-library/react        | Jest, Cypress                             | Test frontend. Coverage ~75%.                                                                                                                                   |
| vitest (desktop) + @testing-library/react      | —                                         | **897 test, 91.41% coverage** (issue #693). CI dedicata `ci-desktop.yml` con path filter. Tutti i file >= 90% (eccetto ReorderPagesModal, limite DnD in jsdom). |
| CI strutturata per piattaforma                 | Singolo test.yml                          | `ci-web.yml` (backend+frontend), `ci-desktop.yml` (desktop), `ci-mobile.yml` (mobile). Ogni CI si attiva solo sui path della piattaforma.                       |
| Dark mode con persistenza                      | localStorage + system preference fallback | —                                                                                                                                                               |

---

## 3. Desktop (Tauri v2)

### Architettura generale

| Scelta                                          | Alternativa               | Motivo                                                                                                                        |
| ----------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Tauri v2                                        | Electron                  | Binario più piccolo (~5MB vs ~150MB), Rust per performance, security.                                                         |
| Frontend desktop separato (`desktop/frontend/`) | Overlay su frontend unico | Sostituisce il sistema di overlay. Zero `isTauri()` conditionali, landing page assente su desktop, manutenzione indipendente. |
| Cartella `desktop/` dedicata                    | Nella root                | Separazione netta: `backend/`, `frontend/`, `desktop/`.                                                                       |
| Rust target MSVC (Windows)                      | MinGW/GNU                 | Tauri richiede MSVC toolchain + Microsoft C++ Build Tools.                                                                    |

### Sidecar (FastAPI locale)

| Scelta                                                           | Alternativa                 | Motivo                                                                                                                                                                                                      |
| ---------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FastAPI sidecar con PyInstaller                                  | Backend remoto sempre       | Funzionamento offline desktop (Fase 1c).                                                                                                                                                                    |
| PyMuPDF con PyInstaller                                          | pdf-lib JS, embedded Python | PyInstaller con `--hidden-import=fitz`. Fallback: embedded Python.                                                                                                                                          |
| Porta 7723                                                       | 8000 (default)              | Hardcoded in Rust, configurabile via SIDECAR_PORT env.                                                                                                                                                      |
| `.env.desktop` con solo campi del modello                        | Variabili extra             | pydantic_settings v2 con `extra='forbid'`. Rimossi `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `SIDECAR_PORT`, `STORAGE_LOCAL_PATH`.                                                                                    |
| SECRET_KEY auto-generata                                         | Hardcoded nel .env          | Se vuota, config.py genera chiave casuale (safe per localhost). Obbligatoria in cloud.                                                                                                                      |
| CORS per Tauri webview                                           | Solo localhost:3000         | Aggiunti origins `tauri://localhost`, `http://tauri.localhost` e `https://tauri.localhost` (PR #572).                                                                                                       |
| `withGlobalTauri: true`                                          | Solo npm packages           | Abilita `window.__TAURI__` globale senza moduli npm. Permette di usare `window.__TAURI__.opener.openUrl()` e `window.__TAURI__.dialog.open()` in produzione. (PR #600)                                      |
| `__TAURI_INTERNALS__` per `tauriInvoke`                          | `window.__TAURI__`          | Fallback IPC sempre disponibile anche senza `withGlobalTauri`. Usato per `isTauri()` detection. (PR #600)                                                                                                   |
| Sidecar cleanup: `CommandChild.kill()` + `std::process::exit(0)` | Solo `taskkill`             | `taskkill /F /IM` da solo non bastava — Windows riavviava il processo orfano. ORA: 1) child.kill() via handle Tauri, 2) taskkill forzato, 3) std::process::exit(0) per terminare definitivamente. (PR #600) |
| UPX compression (O1)                                             | Nessuna compressione        | UPX installato in CI. Sidecar 60MB → ~20MB (PR #549).                                                                                                                                                       |
| MEI temp dir cleanup                                             | —                           | Pulizia directory `_MEI*` orfane in `%TEMP%` prima di spawnare (PR #558).                                                                                                                                   |

### Auth e dati

| Scelta                                             | Alternativa                    | Motivo                                                                                                                                                                                                                      |
| -------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth cloud su Neon per registrazione/login desktop | Auth solo locale (SQLite)      | SQLite locale parte vuoto — nessun utente. Il frontend desktop chiama `https://pdeditor-backend.onrender.com/auth/*` per login/register. Le operazioni PDF restano sul sidecar locale.                                      |
| Fallback auth: locale → cloud                      | Solo cloud                     | `GET /auth/me` prova prima il sidecar locale (127.0.0.1:7723), se fallisce prova il cloud. Così l'app funziona offline se il JWT è in cache.                                                                                |
| Auth offline via Tauri store plugin                | Solo online                    | JWT cached in auth.json. App funzionante offline dopo primo login.                                                                                                                                                          |
| Modalità offline quando JWT scade                  | Force logout                   | Se il refresh token fallisce (nessuna connessione), l'app entra in modalità offline invece di fare logout. L'utente può comunque usare i PDF locali. Alla riconnessione, refresh automatico del JWT.                        |
| Sync user cloud → sidecar via `POST /auth/sync`    | Solo cloud con re-login        | Quando l'utente fa login via cloud, il frontend chiama `/auth/sync` sul sidecar per salvare l'utente in SQLite locale e ottenere un JWT locale + CSRF. Così `getMe()` e `refreshCsrf()` funzionano sul sidecar.             |
| **JWT_SECRET_KEY persistente su file**             | **Chiave random a ogni avvio** | **La chiave JWT è salvata in `%APPDATA%/PdfEditor/secret.key` (o `~/.local/share/PdfEditor/secret.key` su Linux). Generata una volta, riutilizzata ai riavvii. I token JWT sopravvivono ai riavvii del sidecar. (PR #640)** |
| **Sync password per login offline**                | **Solo JWT locale**            | **`POST /auth/sync` ora accetta `password` (plaintext). Il sidecar la hasha con bcrypt e la salva in SQLite locale. Così l'utente può fare login offline dopo il primo sync dal cloud. (PR #640)**                          |
| **Login desktop: locale → cloud → sync**           | **Sempre cloud**               | **Login prova prima SQLite locale. Se utente non trovato (prima volta), prova cloud → sync con password → JWT locale. Login successivi funzionano offline. (PR #640)**                                                      |
| **syncUser usa fetch diretto**                     | **`_fetch` con auto-refresh**  | **`syncUser` usa `fetch` diretto invece di `_fetch` per evitare il loop 401: il JWT cloud non è valido per il sidecar, quindi `_fetch` tentava refresh → falliva → `syncUser` ritornava `null`. (PR #640)**                 |
| CSRF cookie: `secure` dinamico                     | `secure=True` sempre           | `set_csrf_cookie()` rileva automaticamente se la connessione è HTTP (sidecar locale) e usa `secure=False, samesite="lax"` invece di `secure=True, samesite="none"`.                                                         |
| Guest access                                       | Solo registrazione             | Utenti guest temporanei (is_guest flag). Convertibili in account completo. Sempre lato sidecar locale.                                                                                                                      |
| Cloud sync (Fase 3) integrata                      | Sync posticipato               | UUID PK già implementati. Endpoint sync backend + UI sync frontend.                                                                                                                                                         |
| Database offline: SQLite                           | PostgreSQL locale              | Zero configurazione, file-based, perfetto per uso offline.                                                                                                                                                                  |

### UI e UX

| Scelta                                  | Alternativa               | Motivo                                                                                                                                                      |
| --------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dialog nativo con `tauri-plugin-dialog` | `prompt()` browser        | Sostituito `prompt()` nel wizard con `open({ directory: true })`. Fallback a prompt preservato per browser.                                                 |
| Startup screen con 3 step               | Redirect diretto al login | Messaggi di errore specifici (tempo scaduto, connessione rifiutata). Pulsante Riprova.                                                                      |
| System tray su close                    | Uscita completa           | Click X nasconde in tray. Click icona riapre. Menu "Mostra" / "Esci". Sidecar NON killato finché non si clicca "Esci". Richiede `features = ["tray-icon"]`. |
| Single-instance plugin                  | Nessuno                   | Impedisce seconda istanza (e tray duplicati). Seconda istanza porta in primo piano la finestra esistente (PR #558).                                         |
| Auto-update via GitHub Releases         | Download manuale          | Tauri updater built-in.                                                                                                                                     |

### Build e CI/CD

| Scelta                                      | Alternativa               | Motivo                                                                                          |
| ------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------- |
| `@tauri-apps/cli` via npm (devDependency)   | `cargo install tauri-cli` | ~5-12 min risparmiati. Funziona su ARM macOS. (PR #531)                                         |
| `npm --prefix ../frontend exec tauri build` | `npx tauri build`         | npx non trova il binario in `desktop/frontend/node_modules/` da `desktop/src-tauri/`. (PR #539) |
| Preflight 8/8 checks                        | Solo build CI             | 8 check in ~3 min invece di 25 min di CI. (PR #535, #537)                                       |
| Bump versione automatico centralizzato      | Bump manuale              | `scripts/bump-version.js` aggiorna tutti i 9 file. (PR #530)                                    |
| Frontend build parallelo (O3)               | Frontend buildato 3 volte | Job separato `build-frontend` su ubuntu-latest. (PR #553)                                       |
| PyInstaller cache pip (O2)                  | PyInstaller reinstallato  | `pip install pyinstaller` spostato nel backend deps step. (PR #551)                             |
| Rust strip profile (O4)                     | Binario con debug symbols | `strip = true` in `[profile.release]`. (PR #557)                                                |
| NSIS installer hooks                        | —                         | Macro `NSIS_HOOK_PREINSTALL`/`PREUNINSTALL` killano processi prima di install/disinstall.       |
| Build locale obbligatoria prima del tag     | Solo CI GitHub            | AGENT_FLOW: build locale → test → solo se OK → tag GitHub.                                      |

---

## 4. Mobile (React Native / Expo) — Fase 4 (MVP completato + bug fix)

> 📱 **Le decisioni mobile sono documentate in [`mobile/ADR.md`](./mobile/ADR.md).**
> Questo file contiene solo il riferimento. Le scelte architetturali specifiche del mobile (Expo managed, pdf-lib offline, react-native-pdf, auth cloud-only, salvataggio offline, EAS Build) sono trattate nel documento dedicato.

| Scelta                                      | Riferimento                                                     |
| ------------------------------------------- | --------------------------------------------------------------- |
| Stack mobile completo                       | [`mobile/ADR.md`](./mobile/ADR.md)                              |
| Task 2 — Password protect/unlock (in pausa) | `mobile/ADR.md` + `.specs/plans/feature-mobile-improvements.md` |
| Feature pianificate post-MVP                | `.specs/plans/feature-mobile-improvements.md`                   |

---

## Decisioni deprecate

| Scelta deprecata                                                | Sostituita da                          | Data                    |
| --------------------------------------------------------------- | -------------------------------------- | ----------------------- |
| Desktop: stessa UI del web (overlay)                            | Frontend desktop separato              | 2026-07-27              |
| Desktop: frontend-overlay per componenti nativi                 | Frontend desktop separato              | 2026-07-28              |
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

- Mobile React Native (Fase 4) — ✅ **MVP completato** — vedi [`mobile/ADR.md`](./mobile/ADR.md)
- Integrazione pagamenti Stripe (pianificata — vedi `.specs/plans/feature-stripe-mcp-subscriptions.md`)
- SSO Apple / Samsung (previsto come bonus futuro)
- react-native-web (valutabile, non deciso)
- **Annotazioni PDF** (drawing, highlight, commenti) — non implementate

## Roadmap

| Fase                                        | Descrizione                                                                                                            |                                    Stato                                    |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------: |
| **Fase 1c — Desktop app (Tauri v2)**        | Setup Tauri + Next.js build statica. PyInstaller per bundle FastAPI. SQLite locale. Installer per Windows/macOS/Linux. |                           ✅ Completata (v0.1.20)                           |
| **Fase 2 — Web app su cloud**               | Deploy FastAPI su Render. PostgreSQL cloud. Upload file su S3 (Cloudflare R2). Next.js static export.                  |                         ✅ Completata (2026-07-10)                          |
| **Fase 3 — Cloud sync**                     | Sync bidirezionale SQLite ↔ PostgreSQL (UUID + timestamp). Risoluzione conflitti.                                      |                                ✅ Completata                                |
| **Fase 4 — Mobile app (React Native/Expo)** | Setup Expo + auth + upload + viewer + scanner + editing pdf-lib + EAS Build APK.                                       | ✅ Completata (MVP mobile) — dettagli in [`mobile/ADR.md`](./mobile/ADR.md) |
| **Fase 4b — EAS CI Integration**            | Collegare EAS Build a GitHub Actions per build automatica su tag release.                                              |                                 ⬜ In piano                                 |

> 📋 **Storico completo dei fix:** Vedi [`CHANGELOG.md`](./CHANGELOG.md).
> 📦 **Novità strutturate per la download page:** Vedi [`changelog.json`](./changelog.json) — file JSON con versioni e cambiamenti per desktop e mobile, fetchato dinamicamente dalla download page.
> 🐞 **Bug aperti e debito tecnico:** Vedi [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md).
> 📖 **Lezioni apprese:** Vedi [`LESSONS_LEARNED.md`](./LESSONS_LEARNED.md).
> 📝 **Feature pianificate:** Vedi `.specs/plans/`.
