# Architecture Decision Record — Mobile (React Native / Expo)

**Progetto:** PdfEditor — App mobile
**Data:** 2026-08-07 (ultimo aggiornamento 2026-08-12)
**Versioni ADR incluse:** v1.0 (Fase 4 — MVP completato + bug fix + offline auth)
**Autore:** Mirko Bechini

> Questo è l'ADR **dedicato al mobile**. Le scelte cross-platform (auth, API client, error-map, types, licenze) sono in [`ADR.md`](../ADR.md) alla radice. Questo documento copre SOLO le decisioni specifiche dell'app mobile.

## Decisione

App mobile "PdfEditor" per iOS/Android, realizzata con **Expo managed workflow (SDK 57)** e **React Native**, che permette di visualizzare, importare e modificare PDF in locale (offline) usando `pdf-lib`. L'autenticazione e le operazioni che richiedono il cloud avvengono verso il backend FastAPI cloud (`https://pdfeditor-api.mirkobechini.com`).

## Contesto

Completare la Fase 4 della roadmap: portare l'editing PDF su mobile. Il mobile è un **client offline-first**: le operazioni di editing (merge, split, riordino, rimozione pagine, metadati) avvengono direttamente sul dispositivo tramite `pdf-lib`, senza dipendere dal backend. L'auth (login/register/guest) invece richiede il cloud.

---

## Piattaforme scelte

| Livello       | Tecnologia                                      | Ruolo                                                                 |
| ------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| Framework     | Expo SDK 57 (managed workflow)                  | Sviluppo rapido, hot-reload con Expo Go, EAS Build per APK cloud      |
| UI            | React Native 0.86.2 + React 19 + RN Paper (MD3) | Componenti pronti, tema custom arancione, dark/light mode             |
| Navigazione   | `@react-navigation/native-stack`                | Stack navigator (login → home → viewer/scanner/tools/settings)        |
| Editing PDF   | `pdf-lib` (1.17.1)                              | Operazioni PDF offline (merge/split/reorder/remove/metadata)          |
| PDF viewer    | `react-native-pdf` (7.0.4)                      | Viewer nativo con scroll e zoom                                       |
| Scanner       | `expo-camera` (CameraView)                      | Fotocamera → foto → PDF (embedJpg via pdf-lib)                        |
| File system   | `expo-file-system` SDK 57                       | `Paths`, `File`, `Directory`. Legacy solo dove indispensabile         |
| DB locale     | `expo-sqlite`                                   | Metadati PDF in `pdfeditor.db` (tabella `pdfs`)                       |
| Storage auth  | `@react-native-async-storage/async-storage`     | JWT + cache utente offline (import statico)                           |
| Icone         | `@expo/vector-icons`                            | Funziona in APK standalone senza configurazione nativa                |
| Distribuzione | EAS Build (preview: internal distribution)      | Build cloud gratuita, APK scaricabile. Richiede `.easignore` corretto |

---

## Architettura

```
┌──────────────────────────────────────────────┐
│              MOBILE APP (Expo)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │  Login   │ │  Home    │ │ Tools/Scanner │ │
│  │  Screen  │ │  Screen  │ │  /Settings   │ │
│  └────┬─────┘ └────┬─────┘ └──────┬───────┘ │
│       │            │              │          │
│       └─────┬──────┴──────┬───────┘          │
│      ┌──────┴─────┐  ┌────┴─────┐            │
│      │ pdfService  │  │ localDb  │            │
│      │ (pdf-lib)   │  │ (SQLite) │            │
│      └──────┬─────┘  └──────────┘            │
│             │  offline editing               │
│      ┌──────┴─────┐                           │
│      │   shared/  │  (api.ts, auth.tsx,       │
│      │            │   types.ts, error-map)    │
│      └────────────┘                          │
└────────────────┼─────────────────────────────┘
                 │ REST/JSON + JWT (auth)
                 ▼
        FastAPI cloud (backend/)
        https://pdfeditor-api.mirkobechini.com
```

---

## Decisioni architetturali

| Scelta                                               | Alternativa                    | Motivo                                                                                                                                                                                               |
| ---------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| Expo **managed** workflow                            | Expo bare, React Native CLI    | BRIEF diceva "bare", ma la realtà è managed: sviluppo rapido, niente Xcode/Android Studio obbligatorio, EAS Build.                                                                                   |
| `react-native-pdf` (nativo)                          | PDF.js via WebView             | BRIEF proponeva PDF.js via WebView, ma si è scelto il viewer nativo (scroll/zoom integrati, più performante).                                                                                        |
| `pdf-lib` lato client per editing                    | API backend cloud              | Operazioni offline senza dipendere dal cloud. Il cloud resta per auth e sync (futuro).                                                                                                               |
| `expo-file-system` SDK 57 API                        | Solo `expo-file-system/legacy` | SDK 57 usa `Paths`, `File`, `Directory`. Legacy solo dove indispensabile (Scanner, pdfService write).                                                                                                |
| Import **statici** (mai dynamic import)              | `await import()` in runtime    | Dynamic import **non funziona in APK standalone** — rompe pdfService e Scanner. Lezione appresa in build test.                                                                                       |
| `.easignore` pattern ancorati con `/`                | Pattern senza `/`              | Pattern senza `/` iniziale matchavano a qualsiasi profondità, escludendo `mobile/src/shared/`.                                                                                                       |
| `@react-native-async-storage/async-storage`          | `expo-secure-store`            | Semplice per JWT + cache utente offline. Import statico.                                                                                                                                             |
| Auth cloud (`pdfeditor-api.mirkobechini.com`)        | Auth locale (sidecar)          | Il mobile non ha sidecar: per auth dipende dal cloud. Operazioni PDF restano offline.                                                                                                                |
| Modalità offline quando JWT scade                    | Force logout                   | Se il refresh token fallisce (nessuna connessione), l'app entra in modalità offline invece di fare logout. L'utente può comunque usare i PDF locali. Alla riconnessione, refresh automatico del JWT. |
| `react-native-blob-util`                             | `expo-file-system` only        | Usato dove serve encoding/decoding binario (react-native-pdf dipende da esso).                                                                                                                       |
| `i18next` + `react-i18next` + `expo-localization`    | next-intl (web)                | i18n leggero per React Native, con rilevamento lingua sistema tramite expo-localization.                                                                                                             |
| `react-native-paper` MD3 tema dinamico               | Temi separati custom           | Paper Provider con tema live-switching (light/dark/system) gestito da AppSettingsContextuseCallback/useMemo.                                                                                         |
| Auth: `loading` separato da `actionLoading`          | `loading: actionLoading        |                                                                                                                                                                                                      | loading` | Separazione evita che l'overlay di login venga coperto dalla schermata di caricamento della navigazione. |
| AsyncStorage per tema + lingua + sync preferenze     | Expo SecureStore               | Dati non sensibili, persistenza semplice. Include CSRF token, sync mode, sync on startup.                                                                                                            |
| CSRF token persistito in AsyncStorage                | Solo cookie                    | Su RN i cookie non funzionano come su web. Il CSRF token salvato in storage viene ripristinato al riavvio (fix 403 CSRF).                                                                            |
| Sync per-PDF (menu contestuale + dialog post-upload) | Sync automatico globale        | Ogni PDF può essere caricato/rimosso dal cloud singolarmente dal menu long press. Dopo l'upload un dialog chiede se sincronizzare subito.                                                            |
| Test con Jest (jest-expo)                            | @testing-library/react-native  | `@testing-library/react-native` incompatibile con questa versione di RN (TurboModule). I test coprono logica pura (API, DB, hook).                                                                   |

---

## Salvataggio offline (come funziona)

1. **Upload**: `DocumentPicker` sceglie un PDF → `usePdfStorage.pickAndSavePdf()` lo copia in `Paths.document/pdfs/<id>.pdf` (SDK 57 `File`/`Directory`).
2. **Metadati**: `getPageCount()` da `pdf-lib` → salvato in tabella SQLite `pdfs` (`expo-sqlite`, `pdfeditor.db`).
3. **Editing offline**: `pdfService.ts` legge il file (`new File(uri).arrayBuffer()`), lo modifica con `pdf-lib`, lo riscrive con `expo-file-system/legacy` `writeAsStringAsync(base64)`.
4. **Accesso**: `getLocalPdfs()`/`getLocalPdfById()` leggono la tabella `pdfs`. `getLocalPdfs()` restituisce TUTTI i PDF quando `userId` è vuoto/guest (legacy compatibilità).
5. **Sync cloud (F1 implementato)**: i PDF possono essere sincronizzati sul cloud (singolarmente dal menu contestuale o in blocco da Settings). Il sync è bidirezionale. Il sync richiede login reale (guest esclusi).

> ⚠️ **Conseguenza**: alla disinstallazione o alla cancellazione dati, PDF e metadati vanno persi (nessun backup cloud automatico — il sync va abilitato manualmente).

---

## Auth (mobile)

- **Cloud-only**: `api.ts` punta a `https://pdfeditor-api.mirkobechini.com` con `CLOUD_API_URL`.
- **Flussi**: email/password (login/register) + **guest** (login senza credenziali).
- **Persistenza**: JWT salvato in AsyncStorage (`REMEMBER_TOKEN_KEY`), CSRF token in `CSRF_TOKEN_KEY`, utente in cache (`REMEMBER_USER_KEY`).
- **Offline restore**: al riavvio, ripristina JWT + CSRF token + utente in cache. Se il token è scaduto ma l'utente è in cache, mostra l'utente reale (non solo guest).
- **Stati**: `loading` (restore iniziale) separato da `actionLoading` (login/register/guest) — evita che l'overlay di login copra il restore.

---

## Limiti e vincoli noti

- **`react-native-pdf` cache**: il viewer non rimonta automaticamente per un secondo PDF — serve `key={refreshKey}` incrementata in `useEffect([pdfId])` dopo aver settato `pdfUri`.
- **pdf-lib non supporta**: estrazione testo, form icing, annotazioni. Solo manipolazione strutturale (pagine, metadati, merge/split).
- **Sync cloud attivo**: i PDF si sincronizzano col cloud (upload/download bidirezionale). Il sync richiede login reale (guest esclusi). Token JWT scade dopo 1h → refresh automatico implementato (issue #623, endpoint `/auth/refresh` + retry automatico).
- **Tema scuro non completo**: error container in LoginScreen/ForgotPasswordScreen ha `#FFE0E0` hardcoded (non si adatta a dark mode).
- **Replace text**: Rotto su TUTTE le piattaforme (non solo mobile). Vedi FEATURE_COMPARISON.md.

---

## Cosa NON è in scope (per ora)

- JWT refresh automatico (✅ implementato — issue #623, endpoint `/auth/refresh` + retry automatico su tutte le piattaforme)
- Modalità sync auto/ibrido/chiedi collegati alle operazioni (solo "differito" attivo)
- EAS CI Integration (F2 — pianificato)
- Rework UI completo con design Penpot (F8 — priorità alta futura)
- Annotazioni PDF (drawing, highlight, commenti)

---

## Roadmap mobile

| Fase                             | Descrizione                                                                   | Stato                      |
| -------------------------------- | ----------------------------------------------------------------------------- | -------------------------- |
| **Fase 4 — MVP**                 | Setup Expo + auth + upload + viewer + scanner + editing pdf-lib + EAS APK     | ✅ Completata (issue #611) |
| **Fase 4b — EAS CI Integration** | Collegare EAS Build a GitHub Actions per build automatica su tag release      | ⬜ In piano (F2)           |
| **Migliorie post-MVP**           | Metadata (✅), password (✅), sync hook, refresh, search, thumbnail, snackbar | Completati (issue #618)    |
| **Issue #622**                   | B1-B3 + S1-S2 (i18n, tema, bug fix)                                           | ✅ Completata              |
| **Issue #619**                   | Cloud sync + onboarding wizard + dialog conflitti/import/delete               | ✅ Completata              |

---

> 📋 **Storico completo dei fix:** Vedi [`CHANGELOG.md`](../CHANGELOG.md).
> 📦 **Novità strutturate per la download page:** Vedi [`changelog.json`](../changelog.json).
> 🐞 **Bug aperti e debito tecnico:** Vedi [`KNOWN_ISSUES.md`](../KNOWN_ISSUES.md).
> 📖 **Lezioni apprese:** Vedi [`LESSONS_LEARNED.md`](../LESSONS_LEARNED.md).
> 📝 **Feature pianificate:** Vedi [`.specs/plans/feature-mobile-improvements.md`](../.specs/plans/feature-mobile-improvements.md).
