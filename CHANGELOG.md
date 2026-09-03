# Changelog

## 2026-09-03

### 🐛 Fix mobile cloud sync (issue #718)

- **Fix auto-refresh 401**: il check in `mobile/src/shared/api.ts` assumeva `body.detail` come stringa, ma il backend risponde con `{detail: {code, detail}}` (oggetto). Il check `detail.includes("expired")` crashava su un oggetto → il refresh non avveniva → "Impossibile recuperare la lista PDF dal cloud". Fix: gestire sia stringa che oggetto.
- **Test**: 3 nuovi test per il formato errore oggetto (15/15 passano).

## 2026-09-01

### 🐛 Fix desktop/mobile (desktop v0.1.35 | web v0.1.37)

> ⚠️ **Nota mobile:** la versione mobile effettiva è **v0.2.0-mobile**. La v0.2.1-mobile è pianificata ma **non ancora rilasciata**.

- **Fix keep-warm** (issue #712): ping ogni 5min → ogni 14min. Il ping H24 ogni 5min consumava le 100h/mese di compute Neon in ~4 giorni, rompendo il cloud sync.

- **Fix Google login** (issue #710): dopo il login Google il sidecar crashava con `UNIQUE constraint failed: users.email` perché `auth/sync` faceva upsert solo per ID cloud, ignorando l'utente locale esistente con la stessa email. Fix: upsert per email come fallback.
- **Fix token locale** (issue #710): `googleLogin()` ignorava il risultato di `syncUser`, mantenendo il JWT cloud in `api` → 401 loop → 500 su `/pdfs`. Fix: token locale da `syncResult.access_token` usato per `api` e `store_jwt`.
- **Fix migration DB automatica** (issue #710): sidecar crashava con `no such column: pdf_documents.upload_source` su DB legacy. `_add_missing_columns()` riscritta per auto-rilevare colonne mancanti confrontando il modello SQLAlchemy con il DB — nessuna lista manuale necessaria.
- **Fix wizard** (issue #710): `handleFinish()` andava a `/app` senza login. Fix: va a `/login` + salva `pdfeditor_wizard_done`.
- **Fix startup page** (issue #708): passava anche se il sidecar non era pronto (fallback bug rimosso). 401 = API pronta, errore solo se nessuna risposta dopo 15s.
- **Fix sidecar zombie** (issue #708): `kill_by_name()` all'avvio per liberare porta 7723 da istanze precedenti.
- **Fix i18n** `editor.user` mancante in EN e IT.
- **Fix replace text viewer** (issue #702): aggiornamento viewer dopo replace su web, desktop e mobile. Nuovo `ReplaceTextModal` su desktop, `ReplaceTextDialog` su mobile via cloud API.
- **Fix replace text font/size** (issue #704): backend ora preserva font, dimensione e baseline originali tramite `page.get_text("dict")`.
- **AGENT_FLOW**: aggiunta regola "100% coverage per ogni file modificato prima della PR".

## 2026-08-28

### 🧪 Web test coverage 90% (issue #700)

- **Coverage web portata al 94.96% statements, 97.34% lines** (era 85.01%)
- **565 test totali** (da 508, +57 nuovi test)
- **Tutti i file web >= 90% statements** (target raggiunto)
- File portati oltre 90%: auth.tsx (93.02%), Sidebar (92.42%), PdfViewer (92.79%), HeaderControls (96.55%), PasswordInput (100%), GuestConvertBanner (100%), register (97.29%), login (93.61%), tauri.ts (96.15%), usePdfJs (94.11%), EditorPage (92.14%), ClientLayout (100%), MetadataDialog (97.77%), BugReportDialog (96.66%), home page (100%), admin page (95.04%)
- **Dead code rimosso**: EditorPage (5 handler mai chiamati: handleMerge, handleSplit, handleReorder, handleRemove, handleMetadata), admin page (handleSendReset + resetMsg mai collegati a UI)

## 2026-08-27

### 🧪 Web test coverage 70% (issue #698)

- **Coverage web portata all'85.01% statements, 87.65% lines** (era 69.12%)
- **508 test totali** (da 372, +136 nuovi test)
- **Tutti i file web >= 70%** (unico file sotto: EditorPage 67.74% ma 70.55% lines)
- Nuovi file di test: layout-pages (5), download (5), error-map (52), MonkeyLogo (4)
- Test ampliati: RemoveDialog (6→14), ReorderDialog (6→13), SplitDialog (6→11), MetadataDialog (3→9), AdminPage (12→17), EditorPage (31→38), ProfilePage (5→14)

### 🧪 Mobile test coverage 90% (issue #696)

- **Coverage mobile portata al 98.7% statements, 100% lines** (era 76.12%)
- **272 test totali** (da 182, +90 nuovi test)
- **Tutti i file mobile >= 90%**: pdfService.ts (100%), api.ts (96.73%), error-map.ts (100%), localDb.ts (100%), i18n (100%)
- Nuovi file di test: pdfService-utils (7), pdfService-metadata (6), pdfService-protect (11), api-refresh (11), api-branches (13), api-pdf (33)
- Test ampliati: error-map (+1 WRONG_PASSWORD plain text)

## 2026-08-23

### 🐛 Desktop fixes batch (issue #689) + Test coverage 70%+ (issue #691)

- **Coverance desktop frontend portata al 79.77%** (era 71.46%)
- **680 test totali** (da 375, +305 nuovi test)
- **Tutti i file desktop ora >= 70%** di statements coverage
- Nuovi test file: GuestConvertBanner (7), useCloudSync (39), Settings (49), Login (21), Wizard (21), EditorPage (73)
- Test esistenti ampliati: GoogleLoginButton (5→12), SplitPagesModal (6→13), RemovePagesModal (7→13), ReorderPagesModal (7→23)

- **Fix #1:** Login error mapping — ora mostra "Email non trovata" / "Password errata" invece di "Errore imprevisto"
- **Fix #2:** Aggiunta chiave i18n `settings.cloud` in EN e IT
- **Fix #3:** Cloud sync feedback dialog — mostra risultati upload/download/skipped/errors
- **Fix #4:** Cloud sync PDF visibility — filename preservato durante upload
- **Fix #5:** PDF protetti da password saltati durante sync
- **Fix #6:** Sync badges ☁️⏳⚠️ accanto ai PDF + cloud token persistente in localStorage
- **Fix #7:** Workplace folder picker in Settings (Advanced) con dialog nativo
- **Fix #8:** Versione letta da i18n invece di fallback hardcoded v0.1.33
- **Fix #9:** Pulsanti mock Organize/Convert sostituiti con Download funzionante
- **i18n completa:** Tutte le pagine e componenti tradotti (wizard, login, register, profile, license, startup, modali, password input)
- **Test:** 680 test desktop frontend — tutti passanti
- **Cloud sync:** Mappa persistente localId→cloudId in localStorage per evitare re-sync
- **Cloud sync:** Match per filename per PDF già caricati prima della mappa
- **Cloud sync:** Sync all'avvio configurabile
- **Cloud sync:** deletePdf con opzione local/cloud/both
- **Badge emoji:** Sostituito "PDF" con emoji piattaforma (☁️🌐💻📱)
- **Logout:** Ora cancella JWT dal Tauri store persistente (auth.json)
- **Data:** Tempo relativo usa created_at, creato usa pdf_creation_date
- **Bump version:** Script bump-version.js aggiorna anche settings page
- **Folder picker:** Nuovo comando Rust dialog_open_folder

## 2026-08-22

### � Mobile bug fixes + Desktop cartella predefinita (issue #669-#673)

- **Mobile:** Schermata di caricamento durante restore session (remember me) — #669
- **Mobile:** Mostra snackbar di errore quando upload su cloud fallisce — #670
- **Mobile:** PDF salvati in cartella PdfEditor/ invece di pdfs/ — #671
- **Mobile:** Cursore non salta più durante il rename PDF — #672
- **Desktop:** Cartella predefinita per salvataggio PDF (wizard + preferenze) — #673
- **CI mobile:** Aggiunta esecuzione test Jest (prima solo typecheck)

### �🔥 Keep-warm backend + icona origine piattaforma (issue #667, #668)

- **Keep-warm:** GitHub Actions pinga `/health` ogni 5 minuti 24/7 + frontend keep-warm quando l'app è aperta
- **Icona origine:** Ogni PDF mostra 🌐 💻 📱 per indicare da dove è stato caricato (nessuna icona se dalla piattaforma corrente)
- **Backend:** Nuovo campo `upload_source` (web/desktop/mobile) su modello, schema, API upload
- **Migration:** Alembic per aggiungere `upload_source` a `pdf_documents`
- **Mobile:** Invia `upload_source=mobile` nelle upload API

## 2026-08-21

### 🧪 Desktop test suite completa + CI per piattaforma (issue #665)

- **Desktop frontend:** 370 test Vitest — coverage **71.21% lines** (target 70% raggiunto)
- **Test coperti:** Editor page (47), Login (18), Register (10), Settings (21), Wizard (26), Profile (8), Startup (6), componenti modali, auth.tsx, api.ts, error-map.ts, tauri.ts, preferences
- **Rust:** 3 test cargo (get_sidecar_port, read_file_binary)
- **CI ristrutturata per piattaforma:**
  - `ci-web.yml` — backend + frontend web (path filter: backend, frontend, shared)
  - `ci-desktop.yml` — desktop test + build check (path filter: desktop, shared)
  - `ci-mobile.yml` — mobile typecheck (path filter: mobile)
  - `release-desktop.yml` — build Tauri, aspetta backend + frontend + desktop-test
  - `release-mobile.yml` — build EAS, aspetta mobile-test

## 2026-08-18

### 🔐 JWT persistente e login offline desktop (issue #640)

- **Backend:** `JWT_SECRET_KEY` ora è persistente — salvata in `%APPDATA%/PdfEditor/secret.key` invece di essere rigenerata casualmente a ogni avvio del sidecar. I token JWT sopravvivono ai riavvii.
- **Backend:** `SyncUserRequest` ora accetta `password` (plaintext). Il sidecar la hasha con bcrypt e la salva in SQLite locale.
- **Backend:** `sync_user` hasha e salva la password sia per utenti nuovi che esistenti (upsert).
- **Shared Auth:** `syncUser` usa `fetch` diretto invece di `_fetch` per evitare il loop 401 (il JWT cloud non è valido per il sidecar).

### 🖼️ Metadata modal funzionante + fix sidebar (issue #642)

- **Desktop:** Nuovo `MetadataModal` con campi Title, Author, Subject, Keywords, filename editabile
- **Desktop:** Checkbox "Overwrite existing file" — sovrascrive o crea nuova copia
- **Backend:** `UpdateMetadataRequest` supporta `new_filename` e `overwrite` (bool)
- **Backend:** Campi vuoti ora vengono cancellati correttamente
- **Backend:** `updated_at` aggiornato esplicitamente in overwrite
- **Desktop:** Sidebar scrollbar — `min-h-0` + `shrink-0` per scroll funzionante
- **Desktop:** Data display — ora usa `updated_at` invece di `pdf_creation_date`

### 🧹 Pulizia issue

- Chiuse 9 issue su GitHub (#595, #597, #629, #631, #633, #636, #638, #640, #642)
- Spostati in archive i plans completati (desktop-data-persistence, desktop-profile-persistence, desktop-scrollbar)
- **Shared Auth:** Login desktop prova prima SQLite locale → se utente non trovato, prova cloud → sync con password → JWT locale valido.
- **Shared Auth:** Register desktop fa sync con password per abilitare login offline successivi.
- **Shared Auth:** `cloudApi` mantiene separato il JWT cloud per operazioni future.

### 🧹 Pulizia

- **Git:** Ignorati `desktop/frontend/src/shared/` (generato da prebuild) e `desktop/frontend/out/`
- **Git:** Rimossi dal tracking i file generati in `desktop/frontend/src/shared/`

## 2026-08-12

### 🔧 Desktop Google login configurato (issue #627)

- **Backend:** `JWT_SECRET_KEY` auto-generato se vuoto (come già `SECRET_KEY`)
- **Desktop:** Unificato `binaries/.env` con `.env.desktop` (aggiunto `SIDECAR_PORT`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`)
- **Desktop:** Logging aggiunto in `run_backend.py` per debugging connessione
- **Fix:** `PUBLIC_URL` config per Google OAuth redirect (usava URL interno Render invece del dominio personalizzato)

### 🔓 Auth offline dopo login Google (issue #629)

- **Shared Auth:** Aggiunto stato `isOffline` — se JWT scade e non c'è connessione, entra in modalità offline
- **Shared Auth:** `onTokenRefreshFailed` non fa più force logout, entra in modalità offline
- **Shared Auth:** Google login ora persiste il token localmente (localStorage/Tauri store/AsyncStorage)
- **Mobile Auth:** Mantiene profilo utente in cache per uso offline

### 🖥️ Google Login Button visibile su desktop (issue #631)

- **Desktop:** Decommentato `GoogleLoginButton` nella login page (era commentato, quindi invisibile)

### 🧹 Pulizia

- **Release:** Eliminate v0.1.30, v0.1.31, v0.1.32, v0.1.33 (release + tag)
- **Versione desktop:** Corretta da 0.2.0 a 0.1.35 (bump errato, feature erano mobile)

## 2026-08-11

### 🔑 JWT token refresh automatico (issue #623)

- **Backend:** Nuovo endpoint `POST /auth/refresh` — decodifica token scaduto, verifica età (< 30 giorni), emette nuovo token + CSRF
- **Shared API (web/desktop):** `refreshToken()` + auto-retry in `_fetch` su 401/INVALID_CREDENTIALS
- **Shared Auth:** Callback `onTokenRefreshed`/`onTokenRefreshFailed` per persistenza localStorage/Tauri store
- **Mobile API:** Stessa logica adattata per React Native (nessun cookie)
- **Mobile Auth:** Callback per persistenza AsyncStorage + logout su refresh fallito
- **Test:** 6 nuovi test backend per refresh token (369 totali backend, 179 mobile)

### 🧪 Mobile test coverage (issue #621)

- **179 test mobile** (+126 rispetto a 53) — copertura totale su `localDb`, `error-map`, `i18n`
- **Nuovi file di test:** `AppSettingsContext`, `OnboardingContext`, `AuthStorage`, `AuthProvider`, `pdfServiceFull`, `usePdfStorage`, `useSyncQueue`, `i18n`, `cloudSyncApi`
- **Full suite runner:** `bash run-all-tests.sh` / `.\run-all-tests.ps1` per lanciare tutti i test in sequenza
- **Coverage:** `api.ts` 100% lines, `pdfService.ts` 89% lines, overall 88.55% statements

## 2026-08-10

- 🎨 **i18n completa su tutte le schermate mobile** — HomeScreen, ToolsScreen, LoginScreen, ForgotPasswordScreen, SettingsScreen, navigazione (bottom tabs + header). Opzione "System language" (rilevamento automatico da expo-localization) + Italiano / English nel selettore.
- 🌗 **Tema live switching** — Tema chiaro/scuro/system con cambio immediato, persistito in AsyncStorage, senza refresh.
- 🐛 **Login overlay fix** — Separato `actionLoading` da `loading` in auth context: l'overlay (velo nero + ActivityIndicator) ora si mostra correttamente durante login/register.
- 🐛 **Encoding fix** — Corretta doppia codifica UTF-8 in `it.json` (caratteri accentati).
- 🐛 **Header navigazione tradotti** — "PDF Tools", "Scanner", "Forgot Password" now use i18n.
- 📝 **Issue #622 completata** — Mobile bug fixes + Settings improvements (B1-B3, S1-S2).

### Cloud sync mobile (issue #619)

- ☁️ **Cloud sync PDF** — Nuovo `useCloudSync` hook con sync bidirezionale (upload/download), rilevamento conflitti, gestione offline, preferenze (differito/auto/ibrido/chiedi).
- 🧭 **Onboarding wizard** — 6 step alla prima installazione (benvenuto, permessi, tema, lingua, cloud, pronto). Flag `onboarding_completed` in AsyncStorage.
- ⚙️ **Settings sezione Cloud** — Toggle sync, modalità sync, sync all'avvio, stato connessione, "Sincronizza ora".
- 🔍 **Badge sync in Home** — Icona cloud verde (synced) / gialla (pending) / rossa (error) in ogni card PDF.
- 📊 **Progress bar sync** — "Sync in corso... (3/12)" durante la sincronizzazione.
- ⚔️ **ConflictDialog** — Risoluzione conflitti con vista semplice/dettagliata, scelta locale/cloud.
- 📥 **ImportPdfDialog** — Import selettivo dei PDF locali orfani nel cloud (checklist).
- 🗑️ **DeleteSyncDialog** — Cancellazione con scelta: solo dispositivo / solo cloud / entrambi.
- 🔄 **Trigger automatici** — Sync all'avvio (condizionale) + in background (AppState).
- 🐛 **Fix upload blob** — RN 0.86 richiede vero `Blob` nel FormData (non più `{uri,name,type}` hack).
- 🔐 **Gestione token scaduto** — Messaggio chiaro "sessione scaduta" quando il JWT expira.
- ☁️ **Sync per-PDF** — Menu contestuale (long press) con "Carica su cloud" / "Rimuovi dal cloud" per ogni PDF.
- 💬 **Dialog post-upload** — Dopo aver caricato un PDF, chiede se sincronizzarlo subito sul cloud.
- 🔑 **CSRF persistente** — Token CSRF salvato in AsyncStorage e ripristinato al riavvio (fix CSRF validation failed).
- 🛡️ **Directory.create sicuro** — `try/catch` su tutti i `create()` per evitare crash quando la cartella esiste già.

- 🚀 **Mobile release v0.2.0-mobile** — Seconda release mobile APK (EAS Build)
- ✅ **UX: Bottom tabs navigation (F9)** — Home + Settings tabs con MainTabs.tsx, navigazione refactored.
- ✅ **UX: Search bar in Home (M5)** — Searchbar React Native Paper + filteredPdfs via useMemo.
- ✅ **UX: Snackbar in Tools (M1)** — Risultati operazioni mostrati come Snackbar invece di testo statico.
- ✅ **UX: Swipe-to-delete in Home (M4)** — Swipeable (react-native-gesture-handler) per eliminare PDF velocemente.
- ✅ **UX: Snackbar in Home** — Feedback visivo dopo eliminazione PDF.
- ✅ **UX: Preview thumbnail in Home (M6)** — Icona PDF + conteggio pagine come thumbnail visivo in ogni card.
- ✅ **UX: Badge count on app icon (M3)** — expo-notifications setBadgeCountAsync + tabBarBadge in MainTabs.
- ✅ **UX: Multi-select in Home (M8)** — Modalità multi-selezione con checkbox, Select All, batch delete, action bar.
- ✅ **UX: Share PDF (M7)** — Condivisione via Android share sheet con expo-sharing nel context menu.
- ✅ **UX: Splash screen (M10)** — Sfondo arancione in splash screen (via expo-splash-screen plugin).
- ✅ **Task 2: Password protect/unlock (F4)** — Migrato a @cantoo/pdf-lib@2.8.1 con supporto encryption. UI Password/Unlock in ToolsScreen con dialog (protect: conferma password, unlock: singola).
- ✅ **Task 3: Hook useSyncQueue (F6)** — Hook per coda sync offline con persistenza AsyncStorage.
- ✅ **Task 4: Pull-to-refresh in HomeScreen (M2)** — RefreshControl su FlatList.
- ✅ **Download PDF su mobile** — SAF StorageAccessFramework per salvare PDF su dispositivo.
- ✅ **Forgot/reset password su mobile** — Nuovo ForgotPasswordScreen, API + auth context, link in LoginScreen.
- ✅ **F5: Reusable components** — PdfListItem, GuestBanner, SyncStatusBadge.
- 🧹 **Pulizia GitHub** — Branch eliminato, tag v0.2.0-mobile ricreato dopo fix splash screen.
- 🔧 **Fix splash screen validation** — Rimosso campo `splash` da app.json (non valido in SDK 57), installato expo-splash-screen.
- 🧹 **Riorganizzazione .specs/** — 156 file → `active/` (15 da fare) + `archive/` (141 completati).
- 📝 **FEATURE_COMPARISON.md** — Nuovo file con tabella feature cross-platform.
- 📝 **Pagina /download** — Download page con GitHub release fetcher dinamico.
- 📝 **Landing page aggiornata** — Navbar link Download, badge hero corretto, edit text description "coming soon".

## 2026-08-07

- ✅ **Task 1: Metadata editing (F3)** — Dialog per modificare titolo/autore in ToolsScreen. `updateMetadata` già esistente in pdfService, aggiunta UI.
- ⏸ **Task 2: Password protect/unlock (F4)** — Messo in pausa. UI e funzioni `protectPdf`/`unlockPdf` scritte ma non attivabili: `pdf-lib@1.17.1` non supporta encryption. Soluzione alternativa (`@cantoo/pdf-lib` fork) ha compatibilità React Native da verificare. Vedi `.specs/plans/feature-mobile-improvements.md` per dettagli.
- 📝 **Documentazione allineata:**
  - Creato `mobile/ADR.md` — ADR dedicato al mobile con tutte le decisioni, architettura, salvataggio offline, limiti (Task 2 in pausa), roadmap.
  - `ADR.md` (root) — sezione 4 mobile sostituita con riferimento a `mobile/ADR.md`.
  - `BRIEF.md` — corretto: Expo managed (non bare), Fase 3/4 ✅ completate, viewer mobile (react-native-pdf), nota password mobile.
  - `architecture.mmd` — aggiunto blocco `Client_Mobile` con tutte le dipendenze (pdfService, localDb, shared, RN Paper, react-native-pdf).
  - `AGENTS.md` — Onboarding ora legge anche `mobile/ADR.md` per feature mobile-specific.
  - `KNOWN_ISSUES.md` — aggiunta sezione 📱 Mobile con 5 voci (M0-M4: niente sync, .easignore, dynamic import, viewer cache, password in pausa).
  - `AGENT_FLOW.md` — aggiunte sezioni 8 (Mobile workflow), 9 (Version alignment mobile), con regole, EAS Build, differenze dal flusso standard.

## 2026-08-06

- ✅ **Fix mobile MVP bugs** — Issue #614: icona app (1024x1024), password visibility toggle, loading overlay login, errori login visibili, offline restore utente reale, page_count calcolato da pdf-lib, secondo PDF fix (refreshKey), split interattivo (scegli pagine), reorder (pulsanti su/giù), import statici pdfService, expo-font peer dep, ADR/docs aggiornati.
- ✅ **Build #6** — APK con tutti i fix del branch `feature/614-mobile-bug-fixes`.

## 2026-08-04

- ✅ **Mobile app MVP completata** — Issue #611: Expo SDK 57, React Native Paper, navigazione stack, auth (guest + email/password), upload PDF locale, PDF viewer con zoom, scanner fotocamera → PDF, editing base (merge/split/reorder/metadata) con pdf-lib.
- ✅ **Mobile Test CI** — Workflow `test-mobile.yml` per TypeScript check su push/PR.
- ✅ **Mobile Build workflow** — Workflow `build-mobile-apk.yml` per build APD su GitHub runner.
- ✅ **Mobile tests** — 40 test (error-map 13 + api 13 + auth 7 + pdfService 7). Coverage ~30%.
- ✅ **Fix error-map EMAIL_NOT_FOUND** — Separato da `Invalid email or password` (bug trovato dai test).
- ✅ **Fix build rischi** — Rimosso nativewind (non usato), rimosso react-native-reanimated/plugin (opzionale).

## 2026-08-03

- ✅ **Fix: ghost PDF permanent deletion** — Tutti i PDF vengono verificati all'avvio via HEAD request. Se fallisce (404), il record viene cancellato dal DB, non solo dalla UI.
- ✅ **Fix: lingua live** — `key={locale}` su `NextIntlClientProvider` forza il re-render delle traduzioni al cambio lingua dalle settings.
- ✅ **Fix: antialiasing su body** — Spostato `-webkit-font-smoothing` da `<html>` a `<body>`. Rimosso valore fisso dal CSS.
- ✅ **Fix: remember-me checkbox visual state** — Checkbox "Rimani connesso" ora mostra spunta `✓` e sfondo arancione solo quando checked. Quando deselezionato, solo bordino bianco. (PR #606, issue #605)
- ✅ **Fix: PDF viewer scroll container** — Il viewer PDF ora scrolla solo il suo div interno invece di scrollare l'intera finestra.

## 2026-08-02

- ✅ **Native dialog with wizard folder default path** — Nuovo comando Rust `dialog_open` + `read_file_binary` per aprire file dal dialog nativo Tauri partendo dalla cartella wizard. `handleOpenLocal()` usa `isTauri()` per scegliere tra dialog nativo e fallback browser.
- ✅ **Sync cloud user to local sidecar** — Nuovo endpoint `POST /auth/sync` (esente CSRF) che riceve dati utente dal cloud e li salva in SQLite locale. `auth.tsx` chiama `api.syncUser(u)` dopo login/register quando `api.getMe()` fallisce.
- ✅ **Fix CSRF upload: await syncUser mancante** — `api.syncUser(u)` in `restoreSession()` mancava `await`, quindi `refreshCsrf()` partiva prima che l'utente fosse salvato in SQLite locale.
- ✅ **Fix CSRF upload: SameSite cookie cross-site** — Il cookie CSRF usava `SameSite=Lax` su localhost, ma il browser non lo invia su POST cross-site (origin `http://tauri.localhost` → target `127.0.0.1:7723`). Fix: `SameSite=None, Secure=False` su localhost (Chrome/Edge permette).

## 2026-08-01

- ✅ **#600: PR#600 mergiata** — Wizard Sfoglia (window.**TAURI**.dialog), wizard link (window.**TAURI**.opener), sidecar cleanup definitivo con CommandChild.kill() + taskkill + std::process::exit(0)
- ✅ **#583: Auth cloud per login/register desktop (PR #584)** — Login/register chiamano `https://pdeditor-backend.onrender.com/auth/*` (Neon). Operazioni PDF restano sul sidecar locale. getMe prova prima locale poi cloud. Nuova pagina `/register` per desktop.
- ✅ **#585: Wizard link in webview (PR #590)** — Sostituiti `<a target=_blank>` con `@tauri-apps/plugin-opener` per aprire browser esterno (non funziona in Tauri webview).
- ✅ **#586: Wizard Sfoglia dialog (PR #591)** — Sostituito import statico di `@tauri-apps/plugin-dialog` con dynamic import (funziona in static export Next.js).
- ✅ **#587: Editor layout pulito (PR #592)** — Rimosso DocMock con dati finti. Layout senza scrollbar (flex + h-screen). Utente sempre visibile in sidebar. Footer non più fixed.
- ✅ **#588: Sidecar cleanup + focus (PR #593)** — `start_sidecar` non kill più processi esistenti (single-instance). `stop_sidecar` con fallback per nome processo.
- ✅ **#589: Icona desktop (PR #594)** — Rigenerate icone da SVG per installer NSIS e taskbar.
- ✅ **Fix wizard link privacy/termini cliccabili (PR #578, fix #577)** — I testi "termini di licenza" e "privacy policy" nella prima schermata del wizard erano `<span>` non cliccabili. Sostituiti con `<a href target=_blank>` che aprono nel browser esterno.
- ✅ **Fix guest login 403 CSRF (PR #579, fix #574)** — `/auth/guest` e `/auth/guest/convert` non erano in `CSRF_EXEMPT_PATHS`. Aggiunti insieme a test con CSRF abilitato.
- ✅ **Fix wizard Sfoglia senza prompt() (PR #580, fix #573)** — Rimosso fallback a `prompt()` nel pulsante Sfoglia (non funziona in webview Tauri). L'utente scrive il percorso a mano se il dialog nativo fallisce.
- ✅ **Fix sidecar cleanup su quit (PR #581, fix #575)** — `start_sidecar` ora kill sempre il processo fastapi-sidecar esistente prima di spawnarne uno nuovo, garantendo PID sempre noto a `stop_sidecar`.
- ✅ **Icone personalizzate app/tray (PR #582, fix #576)** — Generata icona matching la startup page (quadrato arancione + documento bianco) per tutte le dimensioni (32x32, 128x128, ico, icns, android, iOS).
- ✅ **Fix startup page in produzione — CORS error (PR #572, fix #571)** — La webview Tauri in produzione usa origin `http://tauri.localhost` (senza 's'), ma `ALLOWED_ORIGINS` autorizzava solo `https://tauri.localhost`. Aggiunto `http://tauri.localhost` in `backend/app/core/config.py` e `desktop/.env.desktop`.
- ✅ **#569: Devtools abilitati per debug startup page (PR #570)** — Aggiunto feature `devtools` e `window.open_devtools()` in lib.rs per diagnosi errori console in produzione.

## 2026-07-31

- ✅ **Release v0.1.33 pubblicata** — Build ottimizzazioni (UPX, cache, frontend parallelo, Rust strip), fix Python DLL error.
- ✅ **#555: Fix Python DLL error (PR #558)** — Popup "Failed to load Python DLL" a ogni avvio causato da directory \_MEI* corrotte dopo kill forzato del sidecar. Risolto con cleanup automatico delle \_MEI* orfane in %TEMP% prima di spawnare il sidecar.
- ✅ **#514: Fix NSIS installer hook (PR #557)** — Aggiunto installer.nsh con macro NSIS_HOOK_PREINSTALL/PREUNINSTALL che killano i processi fastapi-sidecar esistenti prima di install/disinstall, prevenendo il fallimento della disinstallazione.
- ✅ **Release v0.1.32 pubblicata** — Sidecar startup fix, build speed (separate frontend), sidecar strip symbols.
- ✅ **#544: Fix sidecar startup, build speed, artifact size (PR #545, #546, #547)** — P1: sidecar non si avviava — `ECONNREFUSED` ora non mostra errore, ritenta per 60s. P2: build più veloce — `beforeBuildCommand` rimosso, frontend buildato in CI separatamente. P3: sidecar `--strip` per ridurre dimensione artifact del 20-30%.
- ✅ **Release v0.1.31 pubblicata** — Single-instance, startup retry, pip cache, Node 24, NSIS .exe, fix doppio sidecar.
- ✅ **#540: Release hardening (PR #541, #542, #543)** — P1: single-instance plugin (no tray duplicati). P2: startup screen retry button su connection refused. P3: pip cache per build più veloce. P4: tutte le action CI aggiornate a Node 24. P5: NSIS .exe incluso nella release. P6: prevenzione doppio sidecar via port check.
- ✅ **Release v0.1.30 pubblicata** — Fix release CI macOS (npm --prefix), fix preflight syntax, npm/Rust cache, Intel macOS target.
- ✅ **#538: Fix release CI — npx non trova @tauri-apps/cli su macOS (PR #539)** — `npx tauri build` da `desktop/src-tauri/` non trovava il binario in `desktop/frontend/node_modules/`. Risolto con `npm --prefix ../frontend exec tauri build -- --ci`. Rimossi step no-op, aggiunte npm cache, Rust cache, target x86_64-apple-darwin, files espliciti in create-release.

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
