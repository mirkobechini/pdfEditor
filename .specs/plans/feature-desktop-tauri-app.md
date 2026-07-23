# Feature: Desktop App (Tauri v2)

**Issue:** — _(da creare)_
**Branch:** `feature/<numero>-desktop-tauri-app`

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

| Componente             | Tecnologia                                         |
| ---------------------- | -------------------------------------------------- |
| **Desktop framework**  | Tauri v2 (Rust)                                    |
| **UI**                 | Next.js static export (riutilizzato dal frontend/) |
| **Backend locale**     | FastAPI sidecar (bundle con PyInstaller)           |
| **PDF processing**     | PyMuPDF (fitz) — già in uso                        |
| **Database offline**   | SQLite (stesso schema, via FastAPI)                |
| **Cloud sync DB**      | PostgreSQL (Neon) — già in uso                     |
| **File storage cloud** | Cloudflare R2 — già in uso                         |
| **Auto-update**        | Tauri built-in updater + GitHub Releases           |
| **Secure storage**     | Tauri safeStorage (JWT offline cache)              |
| **Icone**              | Penpot (design) → esportate SVG/PNG → generate per Tauri + web |
| **Installer**          | Windows .msi, macOS .dmg, Linux .AppImage/.deb     |

## Dipendenze

- Backend FastAPI esistente (completo)
- Frontend Next.js esistente (static export già configurato)
- PyInstaller per bundle sidecar
- Rust toolchain (rustup, cargo)

## Issue (1 issue = 1 branch, max ~1-1.5h ciascuna)

| #   | Issue                              | Stima   | Branch                                    | Dipende da |
| --- | ---------------------------------- | ------- | ----------------------------------------- | ---------- |
| 0   | **Prototipo UI/UX Penpot**         | ~30min  | `feature/XXX-prototipo-penpot-desktop`    | —          |
| 1   | **Setup workspace Tauri**          | ~30min  | `feature/XXX-desktop-setup-tauri`         | #0         |
| 2   | **PyInstaller sidecar (PoC)**      | ~1.5h   | `feature/XXX-desktop-sidecar-pyinstaller` | #1         |
| 3   | **Frontend adapter desktop**       | ~1h     | `feature/XXX-desktop-frontend-adapter`    | #1         |
| 4   | **Auth offline + safeStorage**     | ~1-1.5h | `feature/XXX-desktop-offline-auth`        | #3         |
| 5a  | **Cloud sync — backend endpoints** | ~1h     | `feature/XXX-cloud-sync-backend`          | #4         |
| 5b  | **Cloud sync — frontend UI**       | ~1h     | `feature/XXX-cloud-sync-frontend`         | #5a        |
| 6   | **Auto-update**                    | ~1h     | `feature/XXX-desktop-auto-update`         | #2         |
| 7   | **Installer & packaging**          | ~1h     | `feature/XXX-desktop-installer`           | #6         |

### 0. Prototipo UI/UX (Penpot) — PRIMA DI TUTTO

- [ ] Prototipare schermate desktop con Penpot (vedi sotto)
- [ ] Valutare differenze UI tra web e desktop (menu nativi, shortcuts, layout)
- [ ] Definire flusso onboarding desktop (primo avvio, auth, sync)
- [ ] **Disegnare icona app** (logo unico per web, desktop e mobile)
- [ ] Ottenere approvazione prima di iniziare Issue #1

**Output:** Prototipo Penpot approvato che guida tutte le scelte UI delle issue successive, incluse icone e branding

### 1. Setup workspace Tauri (30 min)

- [ ] Creare cartella `desktop/` nella root del progetto
- [ ] Inizializzare progetto Tauri v2 in `desktop/` (`npm create tauri-app`)
- [ ] Configurare `tauri.conf.json` per Windows, macOS, Linux
- [ ] Generare icone app con `npx tauri icon`
- [ ] Creare `desktop/src-tauri/` con struttura Rust base

**Output:** Struttura `desktop/` funzionante con `cargo tauri dev` che apre la webview

### 2. PyInstaller sidecar + PoC (1.5h)

- [ ] Proof-of-concept: bundle script Python minimale con PyMuPDF
- [ ] Creare script `desktop/build-sidecar.sh` e `.ps1` per bundle
- [ ] Testare PyInstaller con app FastAPI (spec file custom)
- [ ] Verificare inclusione esplicita PyMuPDF (--hidden-import=fitz)
- [ ] Verificare funzionamento sidecar standalone
- [ ] Configurare Tauri per eseguire il sidecar all'avvio

**Output:** `desktop/src-tauri/binaries/fastapi-sidecar` (o .exe) funzionante

**Note tecniche PyInstaller:**

- PyMuPDF (fitz) è un binding C — serve `--hidden-import=fitz` e includere le DLL
- Python 3.12+ richiede attenzione con PyInstaller (supporto sperimentale)
- Usare `pyinstaller --onedir` per debug, `--onefile` per release
- Il binary finisce in `desktop/src-tauri/binaries/`

### 3. Frontend adapter desktop (1h)

- [ ] Modificare `api.ts` per rilevare ambiente desktop (`__TAURI__`)
- [ ] Se desktop: base URL → `http://127.0.0.1:<PORTA>` (sidecar locale)
- [ ] Se desktop: usare Tauri API per file dialogs (al posto di `<input type=file>`)
- [ ] Se desktop: drag & drop nativo via Tauri (API)
- [ ] Verificare che `output: "export"` continui a funzionare

**Output:** Frontend che funziona sia su browser che in webview Tauri

### 4. Auth offline + safeStorage (1-1.5h)

- [ ] Backend: endpoint `POST /auth/offline-token` (JWT con expiry lungo)
- [ ] Frontend: store del JWT in Tauri safeStorage (keychain OS)
- [ ] Stato offline: usare JWT cached per operazioni locali
- [ ] Stato online: auth normale verso backend remoto (Render)
- [ ] UI: badge "offline"/"online" nell'header

**Output:** Utente fa login una volta, JWT cached in keychain, funziona offline

### 5a. Cloud sync — backend endpoints (1h)

- [ ] Backend: endpoint `GET /sync/status` (ultimo sync timestamp)
- [ ] Backend: endpoint `POST /sync/push` (push modifiche locali)
- [ ] Backend: endpoint `GET /sync/pull?since=<timestamp>` (pull remoti)
- [ ] Logica sync: UUID PK già presenti, last-write-wins per conflitti
- [ ] Test backend per tutti gli endpoint sync

**Output:** API sync funzionanti, testate, pronte per il frontend

### 5b. Cloud sync — frontend UI (1h)

- [ ] UI: indicatore di sync (icona che mostra stato: synced/syncing/error)
- [ ] UI: pulsante "Sync now" manuale
- [ ] Logica auto-sync: quando torna online, sync automatico
- [ ] Gestione conflitti: notifica all'utente se necessario

**Output:** UI di sync funzionante con le API di 5a

### 6. Auto-update (1h)

- [ ] Configurare Tauri updater in `tauri.conf.json`
- [ ] Puntare a GitHub Releases per i binari
- [ ] Creare GitHub Action per build automatiche + release
- [ ] UI: notifica update disponibile con "Installa al riavvio"

**Output:** `tauri build` produce installer + release pronta su GitHub

### 7. Installer & packaging (1h)

- [ ] Configurare Windows .msi (WiX o NSIS)
- [ ] Configurare macOS .dmg
- [ ] Configurare Linux .AppImage e .deb
- [ ] Verificare firma codice (almeno Windows, se certificato disponibile)

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

- App desktop funzionante su Windows, macOS, Linux
- Sidecar FastAPI (PyMuPDF) incluso nell'installer
- Stessa UI del web, adattata per desktop (file dialogs nativi, drag & drop)
- Auth offline (JWT in safeStorage)
- Cloud sync bidirezionale (SQLite ↔ PostgreSQL)
- Auto-update via GitHub Releases
- Installer .msi, .dmg, .AppImage

## Status

[ ] Non iniziata
