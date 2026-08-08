# Feature: Mobile App (React Native / Expo) — MVP offline-first

## Obiettivo

Applicazione mobile Android per la modifica e gestione di file PDF con funzionamento offline-first, editing locale tramite `pdf-lib` e sync cloud opzionale quando disponibile. Distribuita come APK su GitHub Releases.

## Dipendenze

- Backend cloud esistente (Render + Neon + Cloudflare R2) — per sync
- Pacchetto `shared/` — tipi, ApiClient, error-map, auth (da adattare per React Native)
- Auth: guest + email/password (già implementata nel backend)

## Stack

| Livello           | Tecnologia                                                        |
| ----------------- | ----------------------------------------------------------------- |
| Framework         | React Native con Expo (managed workflow)                          |
| UI                | React Native Paper + NativeWind (TailwindCSS per RN)              |
| PDF Viewer        | `react-native-pdf` + `react-native-blob-util`                     |
| PDF Editing       | `pdf-lib` (merge, split, reorder, metadata, password)             |
| Scanner           | `expo-camera` + `expo-image-manipulator` (crop)                   |
| File System       | `expo-file-system`                                                |
| Auth storage      | `expo-secure-store` o `@react-native-async-storage/async-storage` |
| Navigazione       | `@react-navigation/native` + bottom tabs + stack                  |
| Offline coda sync | SQLite locale tramite `expo-sqlite`                               |

## Casi d'uso MVP

1. **Auth**: guest login + email/password login/register (online via backend cloud)
2. **Home**: lista PDF locali + badge "da sincronizzare"
3. **Upload**: caricare PDF dal file system del telefono → salvato localmente
4. **Viewer**: aprire PDF, leggere, zoomare con gestures
5. **Scanner**: foto → crop → PDF via pdf-lib
6. **Editing base**: merge, split, riordinare pagine (locale con pdf-lib)
7. **Sync**: push/pull da cloud quando disponibile (futuro, struttura già predisposta)

## Struttura progetto

```
mobile/
├── app.json                   # Expo config
├── App.tsx                    # Entry point (theme provider + navigation)
├── package.json
├── tsconfig.json
├── babel.config.js
├── src/
│   ├── screens/               # Screens (una per route)
│   │   ├── LoginScreen.tsx    # Guest + email/password
│   │   ├── HomeScreen.tsx     # Lista PDF locali
│   │   ├── PdfViewerScreen.tsx
│   │   ├── ScannerScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── components/            # UI components riutilizzabili
│   │   ├── PdfListItem.tsx
│   │   ├── GuestBanner.tsx
│   │   └── SyncStatusBadge.tsx
│   ├── hooks/                 # Custom hooks RN-specific
│   │   ├── usePdfStorage.ts   # Gestione file locali
│   │   ├── useCameraScanner.ts
│   │   └── useSyncQueue.ts    # Coda sync offline (futuro)
│   ├── services/              # Logica di business
│   │   ├── pdfService.ts      # pdf-lib operazioni
│   │   ├── localDb.ts         # SQLite locale
│   │   └── syncService.ts     # Sync cloud (futuro)
│   ├── theme/                 # Tema Paper + custom
│   │   └── index.ts
│   ├── navigation/            # React Navigation config
│   │   └── AppNavigator.tsx
│   └── shared/                # Copia/adapt di shared/src/ per RN
│       ├── api.ts             # ApiClient con fetch standard (no next)
│       ├── types.ts           # Tipi (da shared/src/types.ts)
│       ├── auth.tsx           # AuthContext adattato (AsyncStorage)
│       └── error-map.ts       # Copia da shared/
└── assets/
    ├── icon.png
    └── splash.png
```

## Decisioni architetturali

### Auth offline-first
- All'avvio, l'app carica il JWT da AsyncStorage
- Se presente, tenta `GET /auth/me` sul cloud
- Se fallisce (offline), usa i dati utente in cache
- Guest: chiamata `POST /auth/guest` al cloud, salva JWT localmente
- Email/password: `POST /auth/login` al cloud, salva JWT

### Storage locale
- PDF scaricati → `expo-file-system` documentDirectory
- Metadati PDF e stato utente → SQLite via `expo-sqlite`
- JWT → AsyncStorage (con expo-secure-store in futuro)

### pdf-lib per editing locale
- Merge: unisce array di PDF in uno
- Split: estrae range di pagine in nuovo PDF
- Reorder: riorganizza pagine
- Metadata: aggiorna titolo/autore
- Password: setta/rimuove password

### Scanner → PDF
- `expo-camera` per catturare foto
- `expo-image-manipulator` per crop/ritaglio automatico
- `pdf-lib` per embeddare le immagini in un nuovo PDF

### Sync (post-MVP)
- Coda in SQLite: ogni modifica locale viene registrata con timestamp
- Quando c'è rete, la coda viene processata: push al cloud, pull modifiche remote
- Stessa logica UUID + timestamp del sync desktop

## Output atteso

- APK generato con `eas build --platform android` e distribuito su GitHub Releases
- App funzionante offline: auth, upload, viewer, scanner, editing PDF
- Sync cloud post-MVP

## Status

[x] Completata (MVP v0.1.0 mobile — 2026-08-03)

## Subtask (ordine di implementazione)

### 1. Setup progetto Expo + dipendenze

- `npx create-expo-app mobile --template blank-typescript`
- Installare: react-native-paper, nativewind, react-navigation, expo-file-system, expo-camera, pdf-lib, react-native-pdf, react-native-blob-util, expo-sqlite, async-storage
- Configurare NativeWind + tailwind.config.js

### 1b. CI — Mobile Test CI

- Workflow `.github/workflows/test-mobile.yml`:
  - Trigger: push su `feature/611-*` e `dev`, PR verso `dev`
  - Steps: checkout → setup Node → npm ci → npx tsc --noEmit
  - Nome job: "mobile-test"

### 1c. CI — Release Mobile App

- Workflow `.github/workflows/release-mobile.yml`:
  - Trigger: tag `v*` (stesso trigger della release desktop, ma condizionale)
  - Steps: checkout → setup Node → npm ci → eas build --platform android
  - Richiede: account Expo + EXPO_TOKEN in GitHub secrets
  - APK caricato su GitHub Release esistente (stessa release del desktop)

### 2. Shared adapter per React Native

- Copiare `shared/src/types.ts` → `mobile/src/shared/types.ts`
- Adattare `shared/src/api.ts` → `mobile/src/shared/api.ts` (senza dipendenze next/headers)
- Adattare `shared/src/auth.tsx` → `mobile/src/shared/auth.tsx` (AsyncStorage invece di next + tauri)
- Copiare `shared/src/error-map.ts` → `mobile/src/shared/error-map.ts`

### 3. Theme Paper + navigazione

- Configurare React Native Paper con tema personalizzato
- Setup React Navigation con bottom tabs + stack navigator
- Schermate: Login, Home, PdfViewer, Scanner, Settings

### 4. Auth screen (guest + email/password)

- LoginScreen con tab guest / email-password
- GuestLoginButton chiama POST /auth/guest
- Email/password form chiama POST /auth/login
- Salva JWT in AsyncStorage, redirect a Home

### 5. Home screen (lista PDF locali)

- Mostra lista PDF da SQLite locale
- Pulsante "Upload PDF" → file picker
- Pulsante "Scanner" → ScannerScreen
- Pulsante "Settings"
- Tap su PDF → apre PdfViewerScreen

### 6. Upload PDF

- File picker con `expo-document-picker`
- Copia file in documentDirectory
- Salva metadati in SQLite
- Mostra in HomeScreen

### 7. PDF Viewer + zoom

- react-native-pdf per render
- Pinch-to-zoom via react-native-gesture-handler
- Navigazione pagine (next/prev)

### 8. Scanner fotocamera → PDF

- expo-camera preview
- Scatta foto → expo-image-manipulator per crop
- pdf-lib: crea PDF con l'immagine
- Salva in documentDirectory + SQLite

### 9. Editing base (merge/split/reorder/metadata)

- Schermata "Strumenti" con operazioni PDF
- Merge: seleziona più PDF → pdf-lib merge
- Split: seleziona range pagine → pdf-lib split
- Reorder: drag & drop pagine → pdf-lib reorder
- Metadata: modifica titolo/autore

### 10. Build APK + GitHub Release

- Configurare eas.json per build Android
- `eas build --platform android --profile preview`
- Scaricare APK e allegare a GitHub Release

## CI Workflows

### Mobile Test CI (`.github/workflows/test-mobile.yml`)

- **Trigger**: push su `feature/611-*` e `dev`, PR verso `dev`
- **Steps**: checkout → setup Node → npm ci → `npx tsc --noEmit`
- **Nome job**: `mobile-test`
- **Obiettivo**: garantire che il codice mobile compili senza errori

### Release Mobile App (`.github/workflows/release-mobile.yml`)

- **Trigger**: tag `v*` (stesso trigger della release desktop)
- **Prerequisito**: account Expo gratuito + `EXPO_TOKEN` nei GitHub secrets
- **Steps**: checkout → setup Node → npm ci → `eas build --platform android --non-interactive`
- **Output**: APK caricato sulla stessa GitHub Release del desktop
- **EAS Build**: servizio cloud Expo (gratis, 30 build/mese) — nessun Android SDK richiesto sulla macchina CI

## Note

- L'ADR.md va aggiornato dopo il completamento di ogni subtask significativo
- Il sync cloud (push/pull) è post-MVP — la struttura dati UUID+timestamp è già compatibile
- pdf-lib non supporta editing di testo esistente (come PyMuPDF). Per quello servirà il backend cloud