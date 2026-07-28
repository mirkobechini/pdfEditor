# Feature: Frontend Desktop Separato

## Obiettivo

Sostituire l'attuale architettura fragile (overlay copiato su frontend web) con un **frontend Next.js dedicato per il desktop**, indipendente dalla webapp. Il desktop avrà il suo `package.json`, `next.config.ts`, pagine e layout personalizzati basati sui design "PDF Harmony Suite" su Lovable.

## Problema attuale

- `release.yml` non esegue `sync-overlay.sh` — l'overlay desktop non viene mai copiato in CI
- Il frontend desktop è identico alla webapp (stessa landing page, stessi bug)
- `isTauri()` conditionali sparsi rendono il codice fragile
- Un fix sulla webapp può rompere il desktop e viceversa

## Soluzione

```
progetto/
├── frontend/                        ← web app (Next.js static export) — INALTERATO
│   ├── src/app/
│   │   ├── page.tsx                ← landing page (solo web)
│   │   ├── login/                  ← login web
│   │   └── app/                    ← editor web
│   └── ...
│
├── shared/                          ← NUOVO: logica condivisa (auth, API, error-map, tipi)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── auth.ts                  ← useAuth hook, guestLogin
│       ├── api.ts                   ← API client
│       ├── error-map.ts             ← mapError
│       ├── tauri.ts                 ← isTauri()
│       ├── types.ts                 ← tipi condivisi
│       └── pdf-worker.ts            ← logica PDF condivisa (opzionale)
│
├── desktop/
│   ├── frontend/                    ← NUOVO: frontend desktop dedicato
│   │   ├── package.json
│   │   ├── next.config.ts           ← output: 'export'
│   │   ├── postcss.config.mjs
│   │   ├── tsconfig.json
│   │   ├── messages/                ← i18n (en.json, it.json)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx       ← layout desktop (no landing header)
│   │       │   ├── page.tsx         ← redirect diretto a /login
│   │       │   ├── login/
│   │       │   │   └── page.tsx     ← login design "PDF Harmony Suite"
│   │       │   ├── app/
│   │       │   │   └── page.tsx     ← editor design "PDF Harmony Suite"
│   │       │   ├── wizard/
│   │       │   │   └── page.tsx     ← wizard onboarding (4 step)
│   │       │   ├── settings/
│   │       │   │   └── page.tsx     ← impostazioni
│   │       │   └── admin/
│   │       │       └── page.tsx     ← dashboard admin
│   │       ├── components/
│   │       │   ├── editor/
│   │       │   │   ├── EditorSidebar.tsx      ← sidebar recent docs
│   │       │   │   ├── EditorToolbar.tsx      ← toolbar (Edit/Organize/Convert/Merge/Split/Reorder/Remove/Metadata)
│   │       │   │   ├── EditorViewer.tsx       ← PDF.js viewer
│   │       │   │   ├── EditorInspector.tsx    ← inspector (metadata + fast actions)
│   │       │   │   └── EditorStatusBar.tsx    ← status bar (sidecar, snapshots, encoding)
│   │       │   ├── login/
│   │       │   │   ├── LoginForm.tsx          ← form email/password
│   │       │   │   └── GoogleLoginButton.tsx  ← SSO Google
│   │       │   ├── wizard/
│   │       │   │   ├── WizardShell.tsx        ← shell laterale 4 step
│   │       │   │   ├── StepWelcome.tsx
│   │       │   │   ├── StepLicense.tsx
│   │       │   │   ├── StepWorkFolder.tsx
│   │       │   │   └── StepSync.tsx
│   │       │   ├── settings/
│   │       │   │   ├── SettingsGeneral.tsx
│   │       │   │   ├── SettingsAppearance.tsx
│   │       │   │   ├── SettingsEditor.tsx
│   │       │   │   └── SettingsCloudSync.tsx
│   │       │   ├── admin/
│   │       │   │   ├── AdminOverview.tsx
│   │       │   │   ├── AdminUsers.tsx
│   │       │   │   ├── AdminLicenses.tsx
│   │       │   │   ├── AdminBugReports.tsx
│   │       │   │   └── AdminSettings.tsx
│   │       │   ├── cloud/
│   │       │   │   ├── CloudFileBrowser.tsx
│   │       │   │   └── CloudFileTree.tsx
│   │       │   └── shared/
│   │       │       ├── HeaderControls.tsx
│   │       │       └── PasswordInput.tsx
│   │       └── lib/
│   │           ├── auth.ts           ← re-export da shared/
│   │           ├── api.ts            ← re-export da shared/
│   │           └── error-map.ts      ← re-export da shared/
│   │
│   └── src-tauri/
│       └── tauri.conf.json           ← frontendDist punta a desktop/frontend/out
│
└── frontend/src/                     ← web app esistente (può importare da shared/ via alias)
```

## Dipendenze

- `desktop/frontend/` — dipende da `shared/` per auth, API, error-map
- `frontend/` — può importare da `shared/` ma non necessario (ha già i suoi file)
- `desktop/src-tauri/` — `tauri.conf.json` deve puntare a `../../frontend/out` → `../frontend/out`

## Stack

- Next.js 16 (output: 'export') — stesso della webapp
- React 19 + TailwindCSS v4
- shared/ come workspace locale (package.json con `"main": "src/index.ts"`)
- Alias tsconfig: `"@shared/*": ["../../shared/src/*"]`

## Output atteso

1. `desktop/frontend/` — frontend Next.js autonomo per Tauri
2. `shared/` — package con logica condivisa
3. `desktop/frontend/out/` — build statica generata da `npm run build` in `desktop/frontend/`
4. `tauri.conf.json` aggiornato: `frontendDist: "../../desktop/frontend/out"`
5. `release.yml` aggiornato: build frontend desktop invece di frontend web
6. `desktop/frontend-overlay/` ELIMINATO (non serve più)
7. `frontend/src/lib/tauri.ts` eliminato da frontend web (non serve più)
8. Tutti gli `isTauri()` conditionali rimossi dal frontend web

## Pagine nel frontend desktop (basate su design Lovable)

### 1. Login (`/login`)

- Headline: "Editing PDF di precisione. In locale."
- Sottotitolo: "Accedi al tuo workspace"
- Form: email + password
- Pulsante: "Sign in" arancione
- Divider: "or"
- Google SSO: "Continua con Google"
- Link: "Non hai un account? Registrati"
- Versione in basso: "v2.0.4-stable · AGPL-3.0"

### 2. Editor (`/app`)

- **Sidebar sinistra**: "Open Local PDF" button, Recent Documents (5 items con nome, dimensione, data), Cloud Sync section con avatar utente e license type
- **Toolbar superiore**: File name al centro, Edit/Organize/Convert tabs, Merge/Split/Reorder/Remove/Metadata buttons, Zoom controls (− 125% +), Undo/Redo (⌘Z · ⌘⇧Z), Export As… button
- **Viewer centrale**: PDF.js viewer, pagina "Page 1 of 12", nome file SVG, badge "PDF/A-3b · 300 DPI · TAGGED DOCUMENT"
- **Inspector destro**: Page Metadata (Author, Software, Created, Pages, Size), Fast Actions (MERGE, SPLIT, OCR, LOCK)
- **Status bar**: "Sidecar API: Online (localhost:8000)", UTF-8, "SQLite: local.db", "PyMuPDF v1.24.2", "Snapshots 3 / 10"

### 3. Wizard setup (`/wizard`)

- Shell laterale con 4 step: 01 Benvenuto, 02 Licenza, 03 Cartella di lavoro, 04 Sync opzionale
- Step 1: Benvenuto + consenso licenza
- Step 2: Attiva licenza (input chiave + Attiva & continua)
- Step 3: Scegli cartella di lavoro (Sfoglia… + toggle indicizzazione)
- Step 4: Sync cifrato opzionale (E2EE con passphrase e recovery code)

### 4. Impostazioni (`/settings`)

- Sidebar: General, Appearance, Editor, Cloud & Sync, Shortcuts, Advanced, About
- Appearance: Compact / Cozy / Comfort density toggle

### 5. Cloud workspace (`/cloud`)

- Sidebar: All files, Recent, Shared with me, Starred, Trash
- File tree: Contracts, Invoices 2026, Personal, Design specs
- Stato sync per ogni file

### 6. Admin dashboard (`/admin`)

- Tabs: Overview, Users, Licenses, Bug reports (4), Feature flags, Settings
- Manage button per ogni sezione

### 7. Batch/Convert dialog

- Drop zone, coda job (Compress, OCR text, Convert to PDF/A, Extract images, Merge all)
- "Avvia batch (6)" button

## Pianificazione step

1. **Creare `shared/`** — Estrarre auth, API, error-map, tipi, tauri.ts dal frontend esistente
2. **Creare `desktop/frontend/`** — Inizializzare Next.js con output: 'export'
3. **Implementare layout e routing** — layout.tsx, page.tsx (redirect a login)
4. **Implementare Login page** — design "PDF Harmony Suite"
5. **Implementare Editor page** — sidebar, toolbar, viewer, inspector, status bar
6. **Implementare Wizard** — 4 step
7. **Implementare Settings** — tutte le sezioni
8. **Implementare Admin dashboard** — tabs e gestione
9. **Aggiornare `tauri.conf.json`** — frontendDist al nuovo path
10. **Aggiornare `release.yml`** — build frontend desktop, rimuovere overlay
11. **Eliminare `desktop/frontend-overlay/`** e `isTauri()` dal web
12. **Test** — build desktop funzionante senza landing page

## Status

[ ] Non iniziata
