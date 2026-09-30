# Architecture Decision Record — Mobile (React Native / Expo)

**Progetto:** PdfEditor — App mobile
**Data:** 2026-08-07 (ultimo aggiornamento 2026-09-29)
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

| Scelta                                               | Alternativa                    | Motivo                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| Expo **managed** workflow                            | Expo bare, React Native CLI    | BRIEF diceva "bare", ma la realtà è managed: sviluppo rapido, niente Xcode/Android Studio obbligatorio, EAS Build.                                                                                                                                                                              |
| `react-native-pdf` (nativo)                          | PDF.js via WebView             | BRIEF proponeva PDF.js via WebView, ma si è scelto il viewer nativo (scroll/zoom integrati, più performante).                                                                                                                                                                                   |
| `pdf-lib` lato client per editing                    | API backend cloud              | Operazioni offline senza dipendere dal cloud. Il cloud resta per auth e sync (futuro).                                                                                                                                                                                                          |
| `expo-file-system` SDK 57 API                        | Solo `expo-file-system/legacy` | SDK 57 usa `Paths`, `File`, `Directory`. Legacy solo dove indispensabile (Scanner, pdfService write).                                                                                                                                                                                           |
| Import **statici** (mai dynamic import)              | `await import()` in runtime    | Dynamic import **non funziona in APK standalone** — rompe pdfService e Scanner. Lezione appresa in build test.                                                                                                                                                                                  |
| `.easignore` pattern ancorati con `/`                | Pattern senza `/`              | Pattern senza `/` iniziale matchavano a qualsiasi profondità, escludendo `mobile/src/shared/`.                                                                                                                                                                                                  |
| `@react-native-async-storage/async-storage`          | `expo-secure-store`            | Semplice per JWT + cache utente offline. Import statico.                                                                                                                                                                                                                                        |
| Auth cloud (`pdfeditor-api.mirkobechini.com`)        | Auth locale (sidecar)          | Il mobile non ha sidecar: per auth dipende dal cloud. Operazioni PDF restano offline.                                                                                                                                                                                                           |
| Modalità offline quando JWT scade                    | Force logout                   | Se il refresh token fallisce (nessuna connessione), l'app entra in modalità offline invece di fare logout. L'utente può comunque usare i PDF locali. Alla riconnessione, refresh automatico del JWT.                                                                                            |
| `react-native-blob-util`                             | `expo-file-system` only        | Usato dove serve encoding/decoding binario (react-native-pdf dipende da esso).                                                                                                                                                                                                                  |
| Google OAuth via `expo-auth-session`                 | Solo email/password            | Login Google su mobile con client ID Android/iOS dedicati (in `app.json` → `extra.googleClientId`). Il backend accetta l'audience Android (`GOOGLE_ANDROID_CLIENT_ID`). PR #751, #755, #756.                                                                                                    |
| `i18next` + `react-i18next` + `expo-localization`    | next-intl (web)                | i18n leggero per React Native, con rilevamento lingua sistema tramite expo-localization.                                                                                                                                                                                                        |
| `react-native-paper` MD3 tema dinamico               | Temi separati custom           | Paper Provider con tema live-switching (light/dark/system) gestito da AppSettingsContextuseCallback/useMemo.                                                                                                                                                                                    |
| Auth: `loading` separato da `actionLoading`          | `loading: actionLoading        |                                                                                                                                                                                                                                                                                                 | loading` | Separazione evita che l'overlay di login venga coperto dalla schermata di caricamento della navigazione. |
| AsyncStorage per tema + lingua + sync preferenze     | Expo SecureStore               | Dati non sensibili, persistenza semplice. Include CSRF token, sync mode, sync on startup.                                                                                                                                                                                                       |
| CSRF token persistito in AsyncStorage                | Solo cookie                    | Su RN i cookie non funzionano come su web. Il CSRF token salvato in storage viene ripristinato al riavvio (fix 403 CSRF).                                                                                                                                                                       |
| Sync per-PDF (menu contestuale + dialog post-upload) | Sync automatico globale        | Ogni PDF può essere caricato/rimosso dal cloud singolarmente dal menu long press. Dopo l'upload un dialog chiede se sincronizzare subito.                                                                                                                                                       |
| Test con Jest (jest-expo)                            | @testing-library/react-native  | `@testing-library/react-native` incompatibile con questa versione di RN (TurboModule). I test coprono logica pura (API, DB, hook).                                                                                                                                                              |
| Compressione offline con **re-save pdf-lib**         | react-native-pdf-lib (nativo)  | `react-native-pdf-lib` è vecchia (7 anni) e richiede modifiche native Android/iOS + rebuild APK. Il re-save pdf-lib (rimozione metadati + object streams) è sicuro, offline, senza moduli nativi. Compressione parziale. Fallback: online → cloud API (PyMuPDF, qualità migliore). (issue #827) |

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
- **`react-native-pdf` in modalità `singlePage`**: onora `page` (e le dimensioni di rendering) solo al montaggio — cambiarli dopo non aggiorna la vista. Stesso workaround del punto sopra: `key` che cambia insieme al valore che deve forzare il reload (usato in `PositionSelectorNative` e `PrintOptionsDialog`, issue parità stampa/firma 2026-09-27).
- **Firma/annotazioni via `PositionSelectorNative`** (2026-09-27): riquadro trascinabile/ridimensionabile con zoom+pan sopra l'anteprima della pagina target. Nessuna nuova dipendenza nativa: disegno libero con `react-native-svg` (usa il `toDataURL()` nativo già incluso nella libreria, non serve `react-native-view-shot`), posizionamento con `react-native-pdf` (`singlePage`) + `PanResponder` di RN core.
- **`react-native-pdf`'s `onLoadComplete` size NON è in punti PDF veri** (2026-09-28, trovato testando la firma su device reale): su alcuni documenti riporta una dimensione scalata per il rendering (probabilmente legata al DPI), diversa dalle dimensioni reali della pagina. Usarla per convertire pixel↔punti PDF produceva posizioni/dimensioni sbagliate (mascherato su pagine piccole dal clamp di sicurezza, ma visibile come "firma troppo grande rispetto all'anteprima" su altre). **Fix**: `PositionSelectorNative` ora legge le dimensioni reali della pagina direttamente da `pdf-lib` (la stessa libreria che poi disegna la firma in `signPdf`), usando il valore di `react-native-pdf` solo per l'aspect ratio dell'anteprima visiva.
- **React Native `Blob` non implementa `.arrayBuffer()`** (2026-09-28): `res.blob()` seguito da `blob.arrayBuffer()` fallisce silenziosamente con `TypeError: undefined is not a function` su device reale (i test non lo intercettano: il `Blob` di jsdom/Node supporta `.arrayBuffer()` normalmente). Interessava OCR, annotazioni, compressione online ed export — tutte le operazioni che scaricano un PDF dal backend. **Fix**: `api.downloadPdf`/`api.exportPdf` restituiscono `ArrayBuffer` direttamente via `res.arrayBuffer()` (supportato nativamente), mai più `res.blob()` per leggere byte (resta legittimo solo per popolare `FormData` in upload/import, dove non serve `.arrayBuffer()`).
- **pdf-lib non supporta**: estrazione testo, form icing, annotazioni, compressione vera. Solo manipolazione strutturale (pagine, metadati, merge/split) + re-save per compressione parziale.
- **Sync cloud attivo**: i PDF si sincronizzano col cloud (upload/download bidirezionale). Il sync richiede login reale (guest esclusi). Token JWT scade dopo 1h → refresh automatico implementato (issue #623, endpoint `/auth/refresh` + retry automatico).
- **`LocalPdf.id` (locale) e `LocalPdf.cloud_id` (remoto) sono valori sempre distinti** — il dedup del sync (`getLocalPdfByCloudId`) e la cancellazione cloud dipendono TOTALMENTE da `cloud_id` essere popolato dopo ogni upload. Bug trovato 2026-09-28 (issue #866): il flusso di upload chiamava solo `markPdfCloudSynced` (flag booleano) e mai `setPdfCloudId`, quindi ogni PDF caricato da mobile veniva ri-scaricato come duplicato ad ogni sync successivo — il sync non poteva mai riconoscerlo come "già presente". Qualunque nuovo punto di upload deve chiamare `setPdfCloudId(localId, uploaded.id)` subito dopo `api.uploadPdf(...)`.
- **PositionSelectorNative: un solo `PanResponder` per drag+resize** (2026-09-28, issue #866): due `PanResponder` annidati (uno per il box, uno per il pallino di resize) non si negoziano in modo affidabile sotto la nuova architettura RN (Fabric/Bridgeless) — il pallino trascinava il box invece di ridimensionarlo. **Fix**: un solo `PanResponder` che decide la modalità (drag vs resize) una volta sola al momento del `onPanResponderGrant`, in base a se il tocco è caduto dentro l'area del pallino (40x40 nell'angolo in basso a destra) o no.
- **Rinomina post-azione (sign/annotate/OCR)** (2026-09-28, issue #866): dopo firma/annotazione/OCR, `ToolsScreen` mostra un piccolo dialog per rinominare il file risultante (pre-compilato col nome auto-generato) invece di lasciare solo il nome automatico. Riusa `renamePdfLocally` in `localDb.ts` (nuova funzione, `UPDATE pdfs SET original_filename = ?`).
- **PositionSelectorNative: `renderHeight` deve essere derivato in modo sincrono, mai da `onLoadComplete`** (2026-09-29, issue #866, trovato testando l'annotazione con zoom su device reale): `<Pdf>` è keyato su `${pageNumber}-${zoom}`, quindi rimonta (e richiama `onLoadComplete` in modo asincrono) anche solo cambiando lo zoom. `renderWidth` invece si aggiorna in modo sincrono nello stesso render. Un render poteva quindi accoppiare il nuovo `renderWidth` con il vecchio `renderHeight`, gonfiando l'altezza del box convertita in punti PDF — un piccolo box selezionato finiva per evidenziare molto più testo del previsto. **Fix**: `renderHeight` ora si calcola come `renderWidth * (truePageSize.height / truePageSize.width)`, mai da `onLoadComplete`. Stesso `handleLoadComplete` resettava anche la posizione del box a `(0,0)` ad ogni remount, quindi anche solo zoomando — corretto per resettare solo su un vero cambio pagina.
- **`getLocalPdfById` vs `getLocalPdfByCloudId`: stesso errore del punto sopra su `LocalPdf.id`/`cloud_id`, trovato una seconda volta** (2026-09-29, issue #866): `getPendingChanges` in `useCloudSync.ts` cercava un PDF cloud in locale con `getLocalPdfById(cloudPdf.id)` — ma `cloudPdf.id` è l'id cloud, mai uguale all'id locale — quindi considerava sempre "mancante in locale" anche un PDF già scaricato. Non ancora agganciata a nessuna schermata, ma corretta comunque essendo parte dell'API pubblica dell'hook. **Regola pratica**: ogni volta che si confronta un id proveniente dal backend con un record locale, usare SEMPRE `getLocalPdfByCloudId`, mai `getLocalPdfById`.
- **Dialog con `TextInput` `autoFocus` non deve aprirsi nello stesso render di un reload pesante** (2026-09-29, issue #866): il dialog "rinomina dopo firma/annotazione/OCR" perdeva/spostava caratteri digitati su device reale — causato dall'aprire il dialog (stato + `autoFocus`) nello stesso momento in cui `reloadPdfs()` ricaricava e ri-renderizzava l'intera `FlatList` dei PDF. **Fix**: aprire prima il dialog, fare il reload dopo.
- **`localDb.getDb()`: cache la promise di init, mai solo il valore risolto** (2026-09-29, issue #866, crash reale su device testando l'annotazione): `getDb()` faceva `if (!db) { db = await SQLite.openDatabaseAsync(...); ...migrazioni... }` — se due chiamate arrivavano ravvicinate (tipico appena dopo l'avvio: salvataggio, reload lista, dialog di rinomina in sequenza), entrambe vedevano `db` ancora `null` e aprivano una propria connessione, correndo in parallelo sulle stesse migrazioni `ALTER TABLE`. Risultato: `NativeDatabase.prepareAsync` rifiutata con `NullPointerException` nativa. **Fix**: cachare la Promise di inizializzazione stessa (`dbPromise`), non il DB risolto, così ogni chiamante concorrente attende la STESSA init.
- **`AnnotationFlowDialog` non passava `onSizeChange` a `PositionSelectorNative`** (2026-09-29, issue #866): il rettangolo salvato usava sempre la dimensione di default hardcoded (200x100pt), mai la dimensione effettiva del box ridimensionato a video — visivamente il box sembrava piccolo (su 2 parole), ma l'annotazione salvata copriva sempre l'area di default. `SignFlowDialog` aveva già questo wiring corretto (`onSizeChange={(w, h) => { setSignWidth(w); setSignHeight(h); }}`); mancava solo in `AnnotationFlowDialog`. **Regola pratica**: ogni nuovo utilizzo di `PositionSelectorNative` che permette resize DEVE passare sia `onPositionChange` che `onSizeChange`, altrimenti il resize è solo visivo.
- **`autoFocus` su `TextInput` dentro un `Dialog` (Portal/Modal) di react-native-paper è inaffidabile su Android** (2026-09-29, issue #866): anche dopo aver disaccoppiato l'apertura del dialog dal reload pesante (vedi punto sopra), l'input perdeva/spostava ancora caratteri — causa residua: `autoFocus` afferra la tastiera mentre il Dialog è ancora a metà della propria animazione di entrata (fade+scale del Portal/Modal). **Fix**: niente `autoFocus`, focus manuale via `ref.current?.focus()` dopo un breve `setTimeout` (300ms) per lasciare che l'animazione si assesti.
- **`ToolsScreen` aveva lo stesso bug di lag di `HomeScreen` (issue #801/M6), mai applicato qui** (2026-09-29, issue #866): il `renderItem` della `FlatList` di `ToolsScreen` era una funzione inline, ricreata (e quindi ri-renderizzata per ogni riga visibile) ad OGNI render di `ToolsScreen` — incluso ogni singolo tasto premuto nel dialog di rinomina, dato che vive nello stesso componente. Con una lista lunga, questo era probabilmente la causa residua dei caratteri persi anche dopo aver risolto le due race precedenti. **Fix**: stesso pattern di `PdfListItem` — nuovo componente `ToolsPdfListItem` con `React.memo`, callback di selezione/apertura dialog stabilizzata (`handleItemPress`, via `useCallback` + un ref per le funzioni `open*Dialog` non memoizzate).
- **Bug tastiera Samsung su `TextInput` controllato — root cause confermata, `keyboardType="visible-password"` NON è la soluzione** (2026-09-30, issue #866): dopo aver escluso tutte le cause lato render/timing (le tre voci sopra), il developer ha confermato di usare la tastiera Samsung — problema di compatibilità noto tra il suo motore predittivo e `TextInput` controllati in RN. Il workaround comunemente citato online, `keyboardType="visible-password"` (bypassa il motore di suggerimenti), è stato PROVATO E SCARTATO: su device reale introduceva un bug peggiore — i caratteri nuovi si inserivano all'inizio del campo invece che al cursore (sembrava scrivere da destra a sinistra) più un leggero lag aggiuntivo. **Stato attuale**: solo `autoCorrect={false}`/`spellCheck={false}` applicati (innocui, ma non risolutivi da soli per la tastiera Samsung). Il bug di digitazione resta APERTO su questa tastiera — non ritentare `visible-password` senza nuove evidenze.
- **Tema scuro non completo**: error container in LoginScreen/ForgotPasswordScreen ha `#FFE0E0` hardcoded (non si adatta a dark mode).
- **Replace text**: Rotto su TUTTE le piattaforme (non solo mobile). Vedi FEATURE_COMPARISON.md.

---

## Cosa NON è in scope (per ora)

- JWT refresh automatico (✅ implementato — issue #623, endpoint `/auth/refresh` + retry automatico su tutte le piattaforme)
- Modalità sync auto/ibrido/chiedi collegati alle operazioni (solo "differito" attivo)
- EAS CI Integration (F2 — pianificato)
- Rework UI completo con design Penpot (F8 — priorità alta futura)

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
