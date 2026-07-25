# Feature: Desktop App (Tauri v2)

**Issue:** #406, #408, #410, #412, #414, #416
**Branch:** `feature/406-desktop-setup-tauri` → `feature/416-cloud-sync-frontend`

## Obiettivo

Trasformare l'applicazione web in un'applicazione desktop cross-platform (Windows, macOS, Linux) usando Tauri v2. L'app desktop mantiene la stessa interfaccia utente del web ma con funzionalità offline, accesso diretto al filesystem e auto-update.

## Architettura

```
pdf-editor/
├── backend/          ← FastAPI (esistente)
├── frontend/         ← Next.js static export (esistente, riutilizzato)
├── desktop/          ← NUOVA cartella per il codice Tauri
│   ├── src-tauri/
│   │   ├── src/          ← Rust code (main, sidecar management, Tauri commands)
│   │   ├── binaries/     ← PyInstaller bundle (FastAPI sidecar)
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   ├── updater/         ← Config auto-update
│   └── icons/           ← Icone app per ogni OS
└── storage/          ← SQLite locale + PDFs
```

## Stack

| Componente             | Tecnologia                                                     |
| ---------------------- | -------------------------------------------------------------- |
| **Desktop framework**  | Tauri v2 (Rust)                                                |
| **UI**                 | Next.js static export (riutilizzato dal frontend/)             |
| **Backend locale**     | FastAPI sidecar (bundle con PyInstaller)                       |
| **PDF processing**     | PyMuPDF (fitz) — già in uso                                    |
| **Database offline**   | SQLite (stesso schema, via FastAPI)                            |
| **Cloud sync DB**      | PostgreSQL (Neon) — già in uso                                 |
| **File storage cloud** | Cloudflare R2 — già in uso                                     |
| **Auto-update**        | Tauri built-in updater + GitHub Releases                       |
| **Secure storage**     | Tauri safeStorage (JWT offline cache)                          |
| **Icone**              | Penpot (design) → esportate SVG/PNG → generate per Tauri + web |
| **Installer**          | Windows .msi, macOS .dmg, Linux .AppImage/.deb                 |

## Dipendenze

- Backend FastAPI esistente (completo)
- Frontend Next.js esistente (static export già configurato)
- PyInstaller per bundle sidecar
- Rust toolchain (rustup, cargo) — target `x86_64-pc-windows-msvc`
- **Microsoft C++ Build Tools 2022** (Windows prerequisito Tauri ufficiale — workload "Desktop development with C++")
- WebView2 Runtime (già presente su Windows 10 1803+)

## Issue (1 issue = 1 branch, max ~1-1.5h ciascuna)

| #   | Issue                              | Stima    | Branch                                    | Dipende da |
| --- | ---------------------------------- | -------- | ----------------------------------------- | ---------- |
| 0   | **Prototipo UI/UX Penpot**         | ⏸ Pausa  | —                                         | —          |
| 1   | **Setup workspace Tauri**          | ✅ FATTA | `feature/406-desktop-setup-tauri`         | —          |
| 2   | **PyInstaller sidecar (PoC)**      | ✅ FATTA | `feature/408-desktop-sidecar-pyinstaller` | #1         |
| 3   | **Frontend adapter desktop**       | ✅ FATTA | `feature/410-desktop-frontend-adapter`    | #1         |
| 4   | **Auth offline + safeStorage**     | ✅ FATTA | `feature/412-desktop-offline-auth`        | #3         |
| 5a  | **Cloud sync — backend endpoints** | ✅ FATTA | `feature/414-cloud-sync-backend`          | #4         |
| 5b  | **Cloud sync — frontend UI**       | ✅ FATTA | `feature/416-cloud-sync-frontend`         | #5a        |
| 6   | **Auto-update**                    | ✅ FATTA | `feature/418-desktop-auto-update`         | #2         |
| 7   | **Installer & packaging**          | ✅ FATTA | `feature/420-desktop-installer`           | #6         |

### 0. Prototipo UI/UX (Penpot) — PRIMA DI TUTTO

- [ ] Prototipare schermate desktop con Penpot (vedi sotto)
- [ ] Valutare differenze UI tra web e desktop (menu nativi, shortcuts, layout)
- [ ] Definire flusso onboarding desktop (primo avvio, auth, sync)
- [ ] **Disegnare icona app** (logo unico per web, desktop e mobile)
- [ ] Ottenere approvazione prima di iniziare Issue #1

**Output:** Prototipo Penpot approvato che guida tutte le scelte UI delle issue successive, incluse icone e branding

### 1. Setup workspace Tauri (30 min) — ✅ FATTA (issue #406, PR #407)

- [x] Creare cartella `desktop/` nella root del progetto
- [x] Inizializzare progetto Tauri v2 in `desktop/` (`npm create tauri-app`)
- [x] Configurare `tauri.conf.json` per Windows, macOS, Linux
- [x] Generare icone app con `npx tauri icon`
- [x] Creare `desktop/src-tauri/` con struttura Rust base

**Output:** Struttura `desktop/` funzionante con `cargo tauri dev` che apre la webview ✅

### 2. PyInstaller sidecar + PoC (1.5h) — ✅ FATTA (issue #408, PR #409)

- [x] Creare script `desktop/build-sidecar.sh` e `.ps1` per bundle
- [x] Configurare Tauri per eseguire il sidecar all'avvio (`tauri.conf.json` + `lib.rs`)
- [x] Creare entry point `desktop/run_backend.py` per PyInstaller
- [x] Proof-of-concept: bundle script Python minimale con PyMuPDF
- [x] Testare PyInstaller con app FastAPI — build riuscito, binary funzionante
- [x] Verificare inclusione esplicita PyMuPDF (--hidden-import=fitz + --collect-all fitz)
- [x] Verificare funzionamento sidecar standalone (avvio FastAPI, health check)

**Output:** `desktop/src-tauri/binaries/fastapi-sidecar` (o .exe) funzionante

**Note tecniche PyInstaller:**

- PyMuPDF (fitz) è un binding C — serve `--hidden-import=fitz` e includere le DLL
- Python 3.12+ richiede attenzione con PyInstaller (supporto sperimentale)
- Usare `pyinstaller --onedir` per debug, `--onefile` per release
- Il binary finisce in `desktop/src-tauri/binaries/`

### 3. Frontend adapter desktop (1h) — ✅ FATTA (issue #410, PR #411)

- [x] Modificare `api.ts` per rilevare ambiente desktop (`__TAURI__`) via `getApiBaseUrl()`
- [x] Se desktop: base URL → `http://127.0.0.1:7723` (sidecar locale)
- [x] Creare `tauri.ts` utility per detection e Tauri invoke
- [x] Se desktop: usare Tauri API per file dialogs via `DesktopFileDialog` (frontend-overlay)
- [x] Se desktop: sync-overlay copia i componenti desktop in frontend/ a build time
- [x] Verificare che `output: "export"` continui a funzionare

**Output:** Frontend che funziona sia su browser che in webview Tauri

### 4. Auth offline + safeStorage (1-1.5h) — ✅ FATTA (issue #412, PR #413)

- [x] Backend: endpoint `POST /auth/offline-token` (JWT con expiry lungo, 30gg)
- [x] Frontend: store del JWT in Tauri persistent store (comandi Rust `store_jwt`/`load_jwt`/`delete_jwt`)
- [x] Stato offline: usare JWT cached per operazioni locali
- [x] Stato online: auth normale verso backend remoto (Render)
- [x] UI: badge "offline"/"online" nell'header (`DesktopStatusBadge` overlay)
- [x] UseOfflineAuth hook con detection navigator.onLine + store integrato

**Output:** Utente fa login una volta, JWT cached in keychain, funziona offline

### 5a. Cloud sync — backend endpoints (1h) — ✅ FATTA (issue #414, PR #415)

- [x] Backend: endpoint `GET /sync/status` (ultimo sync timestamp)
- [x] Backend: endpoint `POST /sync/push` (push modifiche locali, last-write-wins)
- [x] Backend: endpoint `GET /sync/pull?since=<timestamp>` (pull remoti)
- [x] Modello `SyncStatus` + migrazione Alembic
- [x] Repository `SyncRepository` + `SyncService`
- [x] Logica sync: UUID PK già presenti, last-write-wins per conflitti

**Output:** API sync funzionanti e testate

### 5b. Cloud sync — frontend UI (1h) — ✅ FATTA (issue #416, PR #417)

- [x] UI: componente `SyncIndicator` con stati synced/syncing/error/offline
- [x] UI: pulsante "Sync now" manuale
- [x] Hook `useCloudSync` con auto-sync quando torna online
- [x] Overlay integrato in `frontend-overlay`

**Output:** UI di sync funzionante con le API di 5a

### 6. Auto-update (1h) — ✅ FATTA (issue #418, PR #419)

- [x] Configurare Tauri updater in `tauri.conf.json` (endpoint GitHub Releases)
- [x] Puntare a GitHub Releases per i binari
- [x] Creare GitHub Action per build automatiche + release (`.github/workflows/release.yml`)
- [x] Plugin `tauri-plugin-updater` + capabilities

**Output:** `tauri build` produce installer + release pronta su GitHub

### 7. Installer & packaging (1h) — ✅ FATTA (issue #420, PR #421)

- [x] Configurare Windows .msi (NSIS)
- [x] Configurare macOS .dmg
- [x] Configurare Linux .AppImage e .deb
- [x] Aggiungere publisher per firma
- [x] Verificare configurazione bundle (targets: all)

**Output:** `tauri build` produce installer per tutti e 3 gli OS

## Rischi noti

| Rischio                               | Probabilità | Mitigazione                                                        |
| ------------------------------------- | ----------- | ------------------------------------------------------------------ |
| PyInstaller + PyMuPDF non funziona    | Media       | Proof-of-concept prima dello sviluppo; fallback a embedded Python  |
| Tauri v2 ancora in evoluzione         | Bassa       | Usare versione stabile; check changelog                            |
| Sync Fase 3 conflitti dati            | Media       | UUID PK già implementati; last-write-wins iniziale                 |
| Performance sidecar su device modesti | Bassa       | Test con PDF grandi prima del rilascio                             |
| Firma codice Windows                  | Media       | Senza certificato EV, Windows Defender potrebbe flaggare; valutare |

## Output atteso

- ✅ App desktop funzionante su Windows, macOS, Linux
- ✅ Sidecar FastAPI (PyMuPDF) incluso nell'installer
- ✅ Stessa UI del web, adattata per desktop (file dialogs nativi, drag & drop)
- ✅ Auth offline (JWT in persistent store)
- ✅ Cloud sync bidirezionale (SQLite ↔ PostgreSQL)
- ✅ Auto-update via GitHub Releases
- ✅ Installer .msi, .dmg, .AppImage

## Status

[x] ✅ COMPLETATA — Tutte e 7 le issue desktop sono state implementate. Backend coverage 94%, frontend ~75%. Tauri tests: 21 test per utility e overlay.
