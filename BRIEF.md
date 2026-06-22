# Brief: PdfEditor

## Obiettivo

Applicazione **cross-platform** per la modifica e gestione di file PDF, con funzionalità di visualizzazione, annotazione, conversione, modifica testo e manipolazione avanzata. Desktop (Tauri), Web (Next.js), Mobile (React Native).

## Stack scelto

| Livello | Tecnologia | Ruolo |
|---------|-----------|-------|
| **Frontend** | React + TailwindCSS | UI condivisa tra web, desktop e mobile |
| **Web app** | Next.js | Versione browser, PWA installabile |
| **Desktop** | Tauri (Rust) | App nativa leggera (~5MB), stessa web UI |
| **Mobile** | React Native | App nativa iOS/Android, logica React condivisa |
| **Backend** | FastAPI (Python) | Auth, elaborazione PDF, cloud sync |
| **PDF modifica testo** | PyMuPDF (fitz) | Modifica testo, estrazione, manipolazione |
| **PDF viewer** | PDF.js (Mozilla) | Render lato client |
| **Database offline** | SQLite | Stessa struttura del cloud, sync bidirezionale |
| **Database cloud** | PostgreSQL | Produzione, sincronizzato con SQLite locale |

## Roadmap

1. **Prototipo (Fase 0)** — Singola pagina HTML statica ✅ Completato
2. **Backend API (Fase 1)** — FastAPI + PyMuPDF per elaborazione PDF, auth, upload/download
3. **Frontend React (Fase 2)** — Next.js + TailwindCSS, UI completa, PWA
4. **Desktop app (Fase 3)** — Tauri wrapper, funzionamento offline con SQLite
5. **Cloud sync (Fase 4)** — Sincronizzazione bidirezionale tra SQLite locale e PostgreSQL cloud
6. **Mobile app (Fase 5)** — React Native, stesse API, SSO Google

## Architettura

```
┌──────────────────────────────────────────────────────┐
│                  CLIENT                               │
│  ┌──────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  NEXT.JS     │  │  TAURI   │  │ REACT NATIVE  │  │
│  │  Web / PWA   │  │ Desktop  │  │ Mobile        │  │
│  │  React+Tailw │  │ ~5MB     │  │ iOS/Android   │  │
│  └──────┬───────┘  └────┬─────┘  └───────┬───────┘  │
│         └───────┬───────┴────────┬────────┘         │
│                 │          REST/JSON (+ JWT)         │
└─────────────────┼───────────────────────────────────┘
                  │
┌─────────────────┼───────────────────────────────────┐
│           BACKEND (FASTAPI)                          │
│  ┌──────────────┴────────────────────────────────┐  │
│  │           FASTAPI (Python)                     │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │ Auth     │ │ PDF proc │ │ Cloud sync   │  │  │
│  │  │ JWT+OAuth│ │ PyMuPDF  │ │ PostgreSQL/S3│  │  │
│  │  └──────────┘ └──────────┘ └──────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  OFFLINE: SQLite + file system locale                │
│  CLOUD:   PostgreSQL + S3 (stessa struttura)         │
└──────────────────────────────────────────────────────┘
```

## Feature roadmap (ordine di implementazione)

### Fase 1 — Backend API (FastAPI)
- [ ] Setup FastAPI + SQLite + PostgreSQL
- [ ] API upload/download file PDF
- [ ] API merge/split PDF (PyMuPDF)
- [ ] API riordino e rimozione pagine (PyMuPDF)
- [ ] API **modifica testo** nei PDF (PyMuPDF)
- [ ] API **modifica metadati** PDF
- [ ] API conversione PDF ↔ DOCX/XLSX/PNG/JPG
- [ ] Autenticazione JWT (email/password)
- [ ] SSO con Google
- [ ] Cloud sync (SQLite ↔ PostgreSQL)

### Fase 2 — UI principale (Next.js + TailwindCSS)
- [ ] Setup Next.js + React + TailwindCSS
- [ ] Porting prototipo da HTML statico a componenti React
- [ ] Sidebar con elenco PDF (upload, elimina, rinomina)
- [ ] Toolbar navigazione + zoom + azioni
- [ ] Viewer PDF.js integrato
- [ ] Dark mode toggle nell'header
- [ ] Design responsive completo

### Fase 3 — Desktop app (Tauri)
- [ ] Setup Tauri + Next.js build integrata
- [ ] Avvio FastAPI locale come sidecar
- [ ] SQLite locale per dati offline
- [ ] Salvataggio file su file system
- [ ] Installer per Windows/macOS/Linux

### Fase 4 — Mobile app (React Native)
- [ ] Setup React Native
- [ ] Riutilizzo componenti React condivisi
- [ ] Viewer PDF.js per mobile
- [ ] SSO Google login
- [ ] Store deployment (Google Play / Apple)

### Fase 5 — Cloud sync
- [ ] Sync bidirezionale SQLite → PostgreSQL
- [ ] Upload file su S3 (o equivalente)
- [ ] Risoluzione conflitti
- [ ] Modalità offline/online

## Librerie chiave

| Libreria | Scopo | Licenza |
|----------|-------|---------|
| **PDF.js** (Mozilla) | Viewer lato client | Apache 2.0 |
| **PyMuPDF** (fitz) | Modifica testo, estrazione, manipolazione | AGPL / Commerciale |
| **pdf-lib** | Merge/split/riordino (anche lato client) | MIT |
| **python-docx** | PDF ↔ DOCX | MIT |
| **openpyxl** | PDF ↔ XLSX | MIT |
| **Pillow** | PDF ↔ immagini | Historical |
| **Authlib** | SSO Google/Apple/Samsung | BSD |
| **SQLAlchemy** | ORM Python | MIT |

## Vincoli

- I file uplodabili devono essere massimo 50MB
- Desktop app leggera (< 50MB installer)
- Funzionamento offline (desktop + mobile)
- Deve essere responsive e funzionare su dispositivi mobili
- Supporto SSO: Google (primario), Apple/Samsung/Samsung (futuro)
- Compatibile con Chrome, Firefox, Safari, Edge
- Solo librerie open source o gratuite
- Cloud save **opzionale** (offline-first)

## Output atteso

- Prototipo Fase 0 ✅ completato
- Backend FastAPI con API REST per tutte le operazioni PDF
- Frontend Next.js + TailwindCSS per browser (PWA)
- App desktop Tauri (Windows, macOS, Linux)
- App mobile React Native (iOS, Android)
- Cloud sync opzionale con PostgresSQL + S3
