# Changelog

## 2026-07-30

- ✅ **#518: Fix macOS release (PR #519)** — `cargo binstall` scaricava binario x86_64 tauri-cli su runner ARM. Ora macOS usa `cargo install` (nativo), Windows/Linux usano `cargo binstall`.
- ✅ **Release v0.1.24 pubblicata** — Fix macOS binstall + cargo install su ARM.
- ✅ **#520: Fix Windows release (PR #521)** — Aggiunto `shell: bash` allo step `Install Tauri CLI` che causava ParserError su Windows (PowerShell non capisce `if [ ... ]`).
- ✅ **Release v0.1.25 pubblicata** — Fix Windows shell + macOS binstall definitivo.
- ✅ **#522: Bump versione i18n (PR #523)** — Aggiornato `desktop/frontend/messages/en.json` e `it.json` da `v0.1.19` a `v0.1.25`. Il bump automatico non aggiornava i file i18n.
- ✅ **#524: Startup screen migliorata con 3 step (PR #525)** — Ripristinata la startup screen come prima schermata con 3 step: "Avvio del backend in locale...", "Connessione al database SQLite...", "Verifica API e servizi...". Messaggi di errore specifici (connessione rifiutata, timeout, ecc.) e pulsante Riprova.
- ✅ **#526: Dialog nativo try/catch (PR #527)** — Aggiunto try/catch a `open()` in wizard page. Se il dialog nativo fallisce, fallback automatico a `prompt()`.
- ✅ **AGENT_FLOW: pre-flight checklist + plan-first rule + release rule** — Aggiunta checklist obbligatoria (branch, issue, plan, consenso, contesto, commit atomic, build, docs, PR). Aggiunta regola: "RELEASE: MAI procedere senza esplicita richiesta del developer". Aggiunta regola post-merge: verificare issue chiusa, branch locale eliminato.
- ✅ **#528: Script bump automatico versione (PR #530)** — Nuovo `scripts/bump-version.js` che aggiorna TUTTI i file con versione in un colpo solo. Preflight check ora controlla anche i messaggi i18n.
- ✅ **#529: Ottimizzazione build CI (PR #531)** — Sostituito `cargo install tauri-cli` con `@tauri-apps/cli` via npm (~5-7 min risparmiati per build).
- ✅ **#532: System tray (PR #533)** — Click X nasconde in tray (icona nella barra). Click icona riapre. Click destro: "Mostra PdfEditor" / "Esci". Sidecar NON killato finché non si clicca "Esci". Richiede `features = ["tray-icon"]` in Cargo.toml.
- ✅ **#534: Fix tauri script + preflight (PR #535)** — Aggiunto `"tauri": "tauri"` a `package.json`. Il preflight ora verifica `npm run tauri -- --version`.
- ✅ **#536: Fix build path + cargo check (PR #537)** — `npx tauri build` ora eseguito da `desktop/src-tauri/` (dove si trova tauri.conf.json). Preflight potenziato a 8/8 checks con `cargo check`.
- ✅ **Preflight 8/8** — Aggiunti: Tauri CLI check, cargo check (Rust compilation), version alignment i18n. Totale: 8 check in ~3 min.

## 2026-07-29

- ✅ **P0.1: Remember-me token non cancellato su network error (PR #479, issue #478)** — Il `catch` di `getMe()` ora distingue errori di rete (TypeError) da errori 401. Il token non viene più cancellato all'avvio se il sidecar non è ancora pronto.
- ✅ **P0.2: JWT da Tauri store caricato all'avvio (PR #481, issue #480)** — All'avvio ora controlla anche `tauriInvoke("load_jwt")` per recuperare il token salvato via Tauri store plugin.
- ✅ **P1.6: Status bar porta dinamica (PR #483, issue #482)** — Sostituita porta hardcoded 8000 con `getApiBaseUrl()` che restituisce 127.0.0.1:7723.
- ✅ **P1.8: Chiavi i18n errore complete (PR #485, issue #484)** — Aggiunte 30+ chiavi i18n in EN/IT per tutti gli errori (auth.invalidCredentials, common.rateLimitExceeded, pdf.notFound, ecc.).
- ✅ **P1.7: Google login reale (PR #487, issue #486)** — Sostituito placeholder con vero componente Google OAuth via `@react-oauth/google`, con chiamata a `googleLogin(idToken)`.
- ✅ **P1.2: Wizard navigazione interattiva (PR #489, issue #488)** — Aggiunta navigazione a 4 step con stato, bottoni avanti/indietro/salta, input licenza, cartella di lavoro, toggle sync, copia recovery code.
- ✅ **P1.4: Settings 7 tab navigabili (PR #491, issue #490)** — Tutti i tab (General, Appearance, Editor, Cloud & Sync, Shortcuts, Advanced, About) con contenuto e navigazione funzionante.
- ✅ **B6: Sidecar PyInstaller hidden-imports (PR #471, issue #470)** — Aggiunti `--hidden-import` completi per uvicorn, fastapi, sqlalchemy, pydantic, ecc. in build-sidecar.sh e build-sidecar.ps1.
- ✅ **B7: NSIS installer hooks (PR #473, issue #472)** — Aggiunto `installerHooks` in tauri.conf.json + `installer.nsh` con macro `NSIS_HOOK_PREINSTALL`/`PREUNINSTALL` che killano processi prima di install/disinstall.
- ✅ **B8: Health check sidecar con timeout (PR #475, issue #474)** — Aggiunto `AbortController` con timeout 5s per ogni tentativo health check. Se fallisce, mostra login con messaggio invece di loading infinito.
- ✅ **B9: iubenda lazyOnload (PR #477, issue #476)** — Spostato script iubenda da `beforeInteractive` a `lazyOnload`, rimosso `z-index: 9999` forzato.
- ✅ **P1.1 Base: Editor con documenti reali (PR #493, issue #492)** — Lista documenti da backend, upload PDF via file picker, metadati reali, sidebar utente autenticato.
- ✅ **Guest login desktop (PR #495, issue #494)** — Aggiunto pulsante "Continue as Guest" nel login desktop, con grafica lucchetto e chiamata a `guestLogin()`.
- ✅ **P1.1 Media: PDF.js viewer + zoom + navigazione (PR #497, issue #496)** — Sostituito mock viewer con PDF.js reale. Canvas dentro la grafica mock originale. Zoom +/- e navigazione pagine ◀▶.
- ✅ **B10: First-launch wizard + fix loading loop (PR #500, issue #498)** — Root page ora reindirizza a `/wizard` alla prima installazione. Rimosso spinner bloccante: ora il login si mostra subito con avviso non bloccante.
- ✅ **B11: CMD flash sidecar (PR #500, issue #499)** — Aggiunto `--noconsole` a PyInstaller per eliminare la finestra CMD all'avvio del sidecar.
- ✅ **B12: Health check più lungo (PR #505, issue #504)** — Aumentato retry a 40 tentativi, polling continuo anche dopo UI mostrata.
- ✅ **B13: Health check più veloce (PR #507, issue #506)** — Timeout fetch 2s, intervallo 500ms, primo tentativo immediato.
- ✅ **Wizard 2 step + cursor-pointer + draft fix (PR #503, issue #501/502)** — Wizard solo Benvenuto+Cartella, cursor-pointer su bottoni, release non più draft.
- ✅ **Startup screen con progress (PR #511, issue #510)** — Nuova pagina `/startup` con 3 step di avvio backend e redirect automatico a wizard/login.
- ✅ **Fix Node 24 deprecation warning (test.yml)** — Aggiunto `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` per eliminare warning su codecov-action.
- ✅ **Release v0.1.17 pubblicata** — Prima release con PDF.js viewer, guest login, first-launch wizard.
- ✅ **Release v0.1.18 pubblicata** — Wizard 2 step, cursor-pointer, startup screen, health check ottimizzato.
- ✅ **#508: Fix sidecar crash su Windows (PR #513)** — Rimosse `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `SIDECAR_PORT`, `STORAGE_LOCAL_PATH` da `.env.desktop` che causavano ValidationError in pydantic_settings.
- ✅ **#509: Dialog nativo per cartella lavoro (PR #514)** — Sostituito `prompt()` con `tauri-plugin-dialog` `open({ directory: true })` nel wizard step 2. Fallback a prompt preservato per browser.
- ✅ **Preflight script locale (PR )** — Script pre-release (`desktop/preflight.sh` + `desktop/preflight.ps1`) che verifica npm ci, next build, import backend e allineamento versioni prima di taggare. Rileva errori come @swc/helpers in 3min invece di 25min di CI.
- ✅ **Preflight job in release.yml** — Nuovo job `preflight` tra `wait-for-ci` e `build`. Blocca la build se npm ci / next build / import backend falliscono.
- ✅ **Release v0.1.20 pubblicata** — Pydantic sidecar fix + dialog nativo cartella di lavoro + preflight.
- ✅ **Release v0.1.22 pubblicata** — Fix macOS sidecar rename (target triple dinamico), fix indent preflight job, fix IndentationError python -c, workflow_dispatch trigger.
- ✅ **#516: Startup screen istantanea (PR #517)** — Rimossa attesa bloccante (60-300s di health check polling). Ora reindirizza immediatamente a /login o /wizard. Il login mostra già un warning non bloccante se il backend non è pronto.
- ✅ **Login health check esteso** — Aumentati retry da 60 a 180s (HEALTH_MAX_RETRIES 30→90) per gestire sidecar lento al primo avvio.
- ✅ **Release v0.1.23 pubblicata** — Startup immediata + cargo-binstall (build CI più veloce).

## 2026-07-28

- ✅ **Desktop frontend separato — pixel perfect UI (issue #459)** — Implementate pagine desktop dedicate in `desktop/frontend/` con flusso wizard, pagina licenza separata e suite impostazioni (iterazioni di refining tipografico/spaziature da mock Lovable).
- ✅ **Desktop settings views complete (issue #459)** — Coperti tab/sezioni mock richiesti, incluse shortcut platform-aware (macOS vs Windows/Linux).
- ✅ **Tauri build allineato al frontend desktop (issue #459)** — Aggiornati path build in `desktop/src-tauri/tauri.conf.json` e metadati in `desktop/src-tauri/Cargo.toml` per usare `../frontend/out` (desktop) invece del frontend web.
- ✅ **Build installer desktop validata** — Build Tauri riuscita con output: `desktop/src-tauri/target/release/bundle/nsis/PdfEditor_0.1.8_x64-setup.exe` e `desktop/src-tauri/target/release/bundle/msi/PdfEditor_0.1.8_x64_en-US.msi`.
- ✅ **Bump release a v0.1.11** — Versioni allineate su tutti i file (tauri.conf.json, frontend/package.json, backend/pyproject.toml, desktop/frontend/package.json, Cargo.toml).
- ✅ **Merge dev → main + tag v0.1.11** — Merge completato, tag creato, push su origin.
- ⛔ **Release v0.1.11 fallita** — Sidecar non buildato correttamente (deps desktop frontend mancanti in CI). Fixato release.yml, rilanciata v0.1.12.
- ⛔ **Release v0.1.12 in corso** — CI in esecuzione con fix deps desktop frontend.
- ✅ **B2: Fix wrapper layout login (PR #465, issue #460)** — Rimossi wrapper intermedi full-bleed, login page senza scrollbar.
- ✅ **B3: Fix password toggle duplicato (PR #466, issue #461)** — Nascosto native browser password reveal via CSS.
- ✅ **B5: Fix traduzione networkError (PR #467, issue #462)** — Aggiunte chiavi i18n `common.networkError` in EN/IT.
- ✅ **B1: Fix sidecar health check (PR #468, issue #463)** — Aggiunto poll con retry sulla login page, attesa sidecar prima del login.
- ✅ **B4: Fix errore Google persistente (PR #469, issue #464)** — Reset errore Google al submit del form email/password.

## 2026-07-27

- ✅ **Desktop env fix (issue #441, PR #446)** — Unificato .env.desktop con GOOGLE_CLIENT_ID, auto-generazione SECRET_KEY, CORS per Tauri webview, logging sidecar.
- ✅ **Guest solo desktop (issue #443, PR #447)** — Pulsante guest visibile solo su desktop (isTauri guard).
- ✅ **Landing page fixes (issue #445, PR #448)** — Rimossa sezione prezzi, aggiunto link download desktop in hero e footer.
- ✅ **Remember me checkbox (issue #442, PR #449)** — Checkbox login per web (localStorage) e desktop (Tauri store).
- ✅ **Webapp UI fixes (issue #444, PR #450)** — Google SVG logo profilo, admin descrizione espandibile, back flash fix, MonkeyLogo fallback, Google button centrato.
- ✅ **Desktop login redirect (issue #451, PR #452)** — Desktop parte sempre da /login, login redirect a /app se remember-me attivo.
- ✅ **Missing import hotfix (v0.1.3)** — Aggiunto import `useAuth` mancante in `page.tsx` (causava build frontend fallita).
- ✅ **CI build check** — Aggiunto `npm run build` in `test.yml` dopo i test per catturare errori di compilazione prima del deploy.
- ✅ **Google button width fix** — Rimosso `width="100%"` (invalido per GSI library), sostituito con wrapper CSS.
- ✅ **Password autocomplete** — Aggiunto `autoComplete="current-password"` a `PasswordInput`.
- ✅ **CI pipeline** — Render ora usa "After CI checks pass" per deploy. Release job aspetta CI verde.
- ✅ **Fix login loading infinito (issue #453, PR #455)** — Root page ora aspetta auth check prima di redirect desktop → /login.
- ✅ **Fix release.yml indent (issue #454, PR #455)** — Python3 bump script non indentato correttamente nel blocco YAML.
- ✅ **Wait-for-ci API diretta** — Sostituita action lewagon/wait-on-check-action con chiamata API GitHub per evitare circolarità.
- ✅ **Auto version bump** — `release.yml` usa python3 per aggiornare versione in tauri.conf.json, package.json, pyproject.toml (portabile macOS/Linux/Windows).

## 2026-07-26

- ✅ **Guest access (issue #427, PR #428)** — Nuovo endpoint `POST /auth/guest` e `POST /auth/guest/convert`, campo `is_guest` su User, pulsante "Continue as Guest" nel login, badge Guest in header, GuestConvertBanner, supporto `?convert=1` in register. 5 test backend, 329 frontend.
- ✅ **Fix CI migration test (issue #431, PR #434)** — Aggiornato `test_downgrade_single_and_upgrade_again` per nuovo head migration `add_is_guest_to_user`.
- ✅ **Path traversal sanitization (issue #432, PR #435)** — Aggiunto controllo path traversal in `get_pdf_path()`. Risolve 5 Code Scanning error.
- ✅ **Workflow permissions (issue #433, PR #436)** — Aggiunto `permissions: contents: read` a `release.yml`. Risolve 3 Code Scanning warnings.
- ✅ **Fix CI frontend (issue #437, PR #438)** — Ripristinato corpo `forgotPassword()` in `api.ts` e aggiunto mock `useSearchParams` in register test. CI ora verde su dev.
- ✅ **mapError in frontend (PR #434, #438)** — Sostituiti `err.message` raw con `mapError()` in 3 file: MetadataDialog, SplitDialog, reset-password.
- ✅ **Render deploy fix (issue #439, PR #440)** — Aggiunto `is_guest` a `_add_missing_columns()` in `main.py`.
- ✅ **Documentation** — Create 5 new plans in `.specs/plans/`: desktop env, remember-me, guest desktop-only, webapp UI fixes, landing page fixes.

## 2026-07-25

- ✅ **Test Tauri utility e overlay (issue #422, PR #422)** — 11 test per `tauri.ts`, 10 test per `useOfflineAuth`, 21 nuovi test frontend.
- ✅ **Test sync backend (issue #424, PR #423)** — 13 test per `sync_service`, `sync_repo`, e API `/sync/status`, `/sync/push`, `/sync/pull`. Coverage backend 94%.

## 2026-07-24

- ✅ **Desktop — Setup workspace Tauri v2 (issue #406, PR #407)** — Struttura `desktop/` + `src-tauri/` completa con tauri.conf.json, Cargo.toml, icone, lib.rs, main.rs.
- ✅ **Desktop — PyInstaller sidecar PoC (issue #408, PR #409)** — `run_backend.py`, script build `.ps1`/`.sh`, `.env.desktop`, sidecar lifecycle in Rust, binary `fastapi-sidecar.exe` funzionante.
- ✅ **Desktop — Frontend adapter con overlay (issue #410, PR #411)** — `tauri.ts` utility, `getApiBaseUrl()` per detection, `DesktopFileDialog` via frontend-overlay, sync-overlay scripts, integrato in build Tauri.
- ✅ **Desktop — Auth offline con Tauri store (issue #412, PR #413)** — Endpoint `POST /auth/offline-token`, comandi Rust `store_jwt`/`load_jwt`/`delete_jwt`, overlay `useOfflineAuth` e `DesktopStatusBadge`.
- ✅ **Desktop — Cloud sync backend (issue #414, PR #415)** — Modello SyncStatus, endpoint `GET /sync/status`, `POST /sync/push`, `GET /sync/pull`, last-write-wins, migrazione Alembic.
- ✅ **Desktop — Cloud sync frontend UI (issue #416, PR #417)** — Componente `SyncIndicator`, hook `useCloudSync`, auto-sync online/offline.
- ✅ **Desktop — Auto-update (issue #418, PR #419)** — Plugin Tauri updater, GitHub Action release.yml, configurazione GitHub Releases.
- ✅ **Desktop — Installer & packaging (issue #420, PR #421)** — NSIS (Windows), DMG (macOS), AppImage/DEB (Linux), publisher.

- ✅ **Expired token cleanup (T3)** — `UserRepository.delete_expired_tokens()` + chiamato da `AuthService.request_password_reset()`. (PR #139)
- ✅ **Admin email configurabile via env (T4)** — `SUPER_ADMIN_EMAIL` leggibile da `.env` tramite Pydantic Settings.
- ✅ **Dark mode persist su tutte le pagine (T5)** — Script `beforeInteractive` in `layout.tsx` esegue prima di React.
- ✅ **B6: Content-Disposition sanitization** — Rafforzata `sanitize_filename()` con allowlist ASCII sicura. 11 test. (PR #399, issue #398)
- ✅ **B3: i18n next-intl** — Sostituito `useLocaleControl()` custom con `useLocale()` di next-intl + `useLocaleSetter()` minimale. (PR #401, issue #400)
- ✅ **PDF naming preservation** — Aggiunto `output_filename` opzionale a merge/split/reorder/remove/replace-text. Backend + frontend. (PR #403, issue #402)
- ✅ **SendGrid rate limit handling** — Rilevamento 429 SendGrid → errore `EMAIL_QUOTA_EXCEEDED` con messaggio chiaro in IT/EN. (PR #405, issue #404)

## 2026-07-17

- ✅ **Backend coverage 96% → 97%** — 15 nuovi test (331 totali, 0 failures). admin.py 97%, auth_service.py 99%. Raggiunto limite pratico per unit test. (PR #361, issue #360)
- ✅ **Backend coverage 94% → 96%** — 15 nuovi test (320 totali, 0 failures). auth.py 100%, convert.py 98%, admin.py 96%. (PR #359, issue #358)
- ✅ **Backend coverage 92% → 94%** — 49 nuovi test (305 totali, 0 failures). Modelli, repositories, email_service al 100%. auth_service 98%, admin 94%. (PR #357, issue #356)

## 2026-07-15

- ✅ **R1+R9: Centralized PDF.js CDN URLs** — Creato `pdfjs-config.ts` con URL condivisi (PR #330, issue #329)
- ✅ **R2+R3: Typed pdfjsLib and PdfViewer refs** — Aggiunto `Window` augmentation + rif tipizzati (PR #332, issue #331)
- ✅ **R4: Removed unused lazy import** — Rimosso import inutilizzato in upload.py (PR #334, issue #333)
- ✅ **R5: logger.exception in email_service** — Stack trace preservato su errori email (PR #336, issue #335)
- ✅ **R6: Typed api.ts return values** — UserResponse per resetPassword e updateProfile (PR #338, issue #337)
- ✅ **R7: require → dynamic import in GoogleLoginButton** — Rimosso antipattern Next.js (PR #341, issue #340)
- ✅ **R8: model_validate in metadata.py** — Consistenza con resto del codice (PR #343, issue #342)
- ✅ **R10: ALLOWED_ORIGINS normalized** — field_validator per spazi in config (PR #345, issue #344)
- ✅ **Bug Google OAuth: validazione startup + debug logging** — GOOGLE_CLIENT_ID obbligatorio in produzione (PR #347, issue #346)
- ✅ **P1: Stream file upload** — Lettura a chunk 1MB invece di intero file in RAM (PR #349, issue #348)
- ✅ **P2: Race condition PdfViewer render** — renderKeyRef per evitare render stale (PR #351, issue #350)
- ✅ **P4: Blob URL leak on unmount** — Revoca blob URL su smount di EditorPage (PR #353, issue #352)
- ✅ **P6: Toolbar keyboard listener instabile** — Refs per callback stabili (PR #355, issue #354)

## 2026-07-14

- ✅ **Bug B1: Duplicate HTTPException in auth.py** — Rimosso dead code in `update_me()` (PR #288, issue #287)
- ✅ **Bug B2: \_cleanup_all_pdf_handles non funzionante** — Rimossi `_open_pdf_handles` (mai popolato) e relativa funzione (PR #290, issue #289)
- ✅ **Bug B3: PDF protetto senza cache restituiva bytes cifrati** — Ora lancia ValueError con messaggio chiaro (PR #292, issue #291)
- ✅ **Bug B4: Header duplicati in uploadPdf()** — Rimosso `headers: this.getHeaders()` da uploadPdf() (PR #294, issue #293)
- ✅ **Bug B5: handleDelete non chiamava api.deletePdf** — Centralizzata logica delete in page.tsx (PR #296, issue #295)
- ✅ **Bug B6: SECRET_KEY vuoto — token forgeable** — Validazione all'avvio in main.py (PR #298, issue #297)
- ✅ **Bug B7: \_run_migrations chiamato 2 volte** — Rimosso create_all duplicato in lifespan (PR #300, issue #299)
- ✅ **Bug B8: \_add_missing_columns silenziava tutte le eccezioni** — Ora cattura solo OperationalError (PR #302, issue #301)
- ✅ **Bug B9: SUPER_ADMIN_EMAIL default pericoloso** — Startup bloccato se default in produzione (PR #304, issue #303)
- ✅ **Bug B10: login falliva silenziosamente se getMe falliva** — Redirect a / invece di lasciare utente in limbo (PR #306, issue #305)
- ✅ **Bug B11: logout non puliva stato su errore** — try/finally per pulire sempre stato (PR #308, issue #307)
- ✅ **Bug B12: check dimensione file inconsistente** — Uniformato `>` a `>=` in convert.py (PR #310, issue #309)
- ✅ **Bug B13: race condition mount getMe vs login** — `_pendingAuthRef` per evitare flash logged out (PR #312, issue #311)
- ✅ **Bug B14: PdfViewer script cleanup rompeva multi-instanza** — Non rimuove piu script CDN condiviso (PR #314, issue #313)
- ✅ **Bug B15: uploadPdfWithProgress ignorava JSON error body** — Ora parsato come extractError (PR #316, issue #315)
- ✅ **Bug B16: Sidebar useEffect missing deps** — loadFiles spostato dentro l'effect (PR #318, issue #317)
- ✅ **Bug B17: Google OAuth dead code** — Rimosso if/else morto nel lookup certs (PR #320, issue #319)
- ✅ **Bug B18: password cache non pulita su shutdown** — Aggiunta \_clear_password_cache() (PR #322, issue #321)- ✅ **Bug B19: resource leak in merge()** — try/finally per chiudere documenti su eccezione (PR #324, issue #323)
- ✅ **Bug B20: admin.py return type errato** — Corretta annotation a UserListResponse (PR #326, issue #325)
- ✅ **Bug B21: handleEditText dead code** — Rimossa funzione mai chiamata (PR #328, issue #327)- ✅ **ADR audit** — Aggiunta sezione con 21 bug trovati nel codice + 10 miglioramenti
- ✅ **21 bug-audit plans** — Creati `.specs/plans/bug-audit-*.md` per ogni bug

## 2026-07-13

- ✅ **Bug fix: cookie cross-origin login** — `api.ts` ora passa `credentials: 'include'`, `samesite='none'` in produzione (PR #261, issue #260)
- ✅ **CI/CD: 256 test verdi** — Fix `DEBUG=True` in conftest + CSRF test con httpx fresh client
- ✅ **Forgot-password: 404 se email non trovata** — Messaggio chiaro invece di 202 generico
- ✅ **Email: SMTP → SendGrid HTTP API** — Render blocca porta 587, ora usa API HTTP (PR #263, issue #262)
- ✅ **Test auth riscritti per flusso cookie-based** — Coprono il flusso reale di produzione
- ✅ **Bug report: select categoria** — Aggiunto campo Category (UI, PDF Processing, Auth, ecc.) (PR #265, issue #264)
- ✅ **Dark mode dropdown fix** — CSS globale per option leggibili in dark mode (issue #266)
- ✅ **CI: CodeQL permissions fix** — Aggiunto `permissions: contents: read` al workflow
- ✅ **AGENT_FLOW aggiornato** — Subtask decomposition, CI-first merge, end-of-task validation
- ✅ **ADR aggiornato** — Lezioni apprese post-deploy + regole qualità test

## 2026-07-12

- ✅ **Bug report de-duplication & voting** — Ricerca bug esistenti, voto, report_count (PR #252)
- ✅ **Backend coverage 93%** — csrf 100%, storage 100% (PR #249, #250)
- ✅ **Starlette status constants fix** — Raw integers per compatibilità cross-version (PR #247)
- ✅ **CI/CD pipeline** — test.yml unificato, Node 22, Force Node24, PYTHONPATH fix
- ✅ **Privacy Policy page** — GDPR/CCPA compliant, 10 sezioni (PR #256)
- ✅ **Terms of Service page** — 7 sezioni legali (PR #256)
- ✅ **Cookie Policy page** — 4 sezioni (PR #256)
- ✅ **Landing footer pages** — Status, Docs, Guide, FAQ, API, Roadmap (PR #256)
- ✅ **Landing footer links** — Tutti i link ora puntano a pagine reali (PR #256)
- ✅ **Admin send reset email** — Pulsante nella dashboard admin (PR #237)
- ✅ **User bug report status** — Sezione bug reports nel profilo (PR #235)
- ✅ **ADR aggiornato** — Coverage, test counts, feature completate
- ✅ **pdf_service.py refactor** — Estratto PdfMergeSplitService (PR #241)
- ✅ **api.ts refactor** — Tipi in api-types.ts (PR #244)
- ✅ **Sidebar UX error feedback** — Messaggio errore su loadFiles fallito (PR #245)
- ✅ **Password strength validation on reset** — Aggiunta validazione password in reset_password() (PR #218)
- ✅ **usePdfJs hook extract** — Rimosso codice duplicato PDF.js in Split/Reorder/Remove dialogs (PR #220)
- ✅ **License seed extract** — Dati seed condivisi tra main.py e conftest.py (PR #222)
- ✅ **Password strength** — Validazione backend (PR #208)
- ✅ **Header injection** — Sanitize Content-Disposition (PR #208)
- ✅ **Frontend tests Phase 1** — Sidebar, Toolbar, PdfViewer tests (131 total, 40% coverage)
- ✅ **Code Review #1** — Password strength su reset password (PR #218)
- ✅ **Code Review #2** — License features seed duplicato rimosso (PR #222)
- ✅ **Code Review #3** — PDF.js loading duplicato → usePdfJs hook (PR #220)
- ✅ **Code Review #4** — ADR slim 50% + CHANGELOG.md creato (PR #224)
- ✅ **Code Review #5** — pdf_service.py split → PdfMergeSplitService (PR #241)
- ✅ **Code Review #6** — api.ts types → api-types.ts (PR #244)
- ✅ **Code Review #7** — Sidebar error feedback UX (PR #245)

## 2026-07-11

- ✅ **CSRF protection middleware** — Protezione CSRF con cookie token (PR #214)
- ✅ **JWT httpOnly cookie** — Eliminata vulnerabilità XSS localStorage (PR #216)
- ✅ **Graceful shutdown** — Cleanup PyMuPDF handles su SIGTERM (PR #212)
- ✅ **Large file upload progress bar** — Progress indicator in Sidebar (PR #206)
- ✅ **Admin bug report display** — Colonne platform, app_version, os_info (PR #204)
- ✅ **Backend coverage** — 92% (225 test, 0 failures) (PR #202)
- ✅ **Warning suppression** — 0 warnings nei test
- ✅ **Librerie aggiornate** — fastapi 0.139.0, slowapi 0.1.10

## 2026-07-10

- ✅ **Fix 3 test falliti** — google_oauth + migration PermissionError (PR #200)
- ✅ **User dashboard** — Pagina `/app/profile` (PR #198)
- ✅ **Admin license restrictions** — Protezione licenze pagate (PR #196)
- ✅ **Metadata pre-populate** — Campi pre-popolati in MetadataDialog (PR #194)
- ✅ **PDF sidebar refresh** — Nuovo PDF visibile senza F5 (PR #192)
- ✅ **Login infinite loading** — Fix loading state (PR #190)
- ✅ **Google OAuth account linking** — Collegamento account Google

## 2026-07-09

- ✅ **Security audit** — DEBUG=False, SECRET_KEY richiesto, health check, rate limiting
- ✅ **Dependency bumps** — PyJWT 2.13.0, python-multipart 0.0.31, pytest 9.0.3
- ✅ **CodeQL fix** — Path traversal protection in storage.py

## 2026-07-08

- ✅ **Render deploy** — Backend + frontend + PostgreSQL su Render
- ✅ **S3 storage** — Cloudflare R2 per persistenza PDF
- ✅ **Render MCP server** — Setup per automazione deploy

## 2026-07-02 — Completamenti vari

- ✅ **ReplaceTextDialog** — Find & replace UI
- ✅ **PdfThumbnail** — Componente fallback per anteprime
- ✅ **Dashboard admin filtri** — Filtri per licenza, data, email
- ✅ **MAX_SNAPSHOTS configurabile** — Da `.env`

## 2026-06-25 — 2026-07-01 (Prima fase)

- ✅ Auth UI (login/register)
- ✅ Dark mode persistente
- ✅ License enforcement backend
- ✅ Bug report model + UI
- ✅ Merge/Split/Reorder/Remove dialogs
- ✅ DeleteModal con anteprima
- ✅ Admin dashboard
- ✅ Auth endpoint PDF (user_id protection)
- ✅ next-intl migration
- ✅ PDF password protection
- ✅ Undo/Redo snapshots
- ✅ MAX_UPLOAD_SIZE_MB e MAX_PAGE_COUNT enforce
- ✅ Test coverage frontend reporting
- ✅ Google SSO
- ✅ Reset password con token
- ✅ Super admin protection
