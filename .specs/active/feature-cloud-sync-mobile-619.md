# Feature: Cloud sync PDF mobile + Onboarding wizard (issue #619)

## Obiettivo

Permettere all'utente mobile di sincronizzare i propri PDF con il cloud backend e introdurre un onboarding wizard alla prima installazione.

---

## Status: ✅ COMPLETATA (da testare su APK)

Tutti i componenti implementati:
- ✅ C1 — Onboarding wizard (6 step)
- ✅ C2 — useCloudSync hook + sync bidirezionale
- ✅ C3 — Settings sezione Cloud
- ✅ Conflitti — ConflictDialog (vista semplice/dettagliata)
- ✅ Import selettivo — ImportPdfDialog
- ✅ Delete sync — DeleteSyncDialog (locale/cloud/entrambi)
- ✅ Home badge sync + progress bar
- ✅ Auto sync all'avvio + background (AppState)
- ✅ i18n EN/IT completo

## Work remaining (da fare in altre issue)
- JWT token refresh automatico → `.specs/active/feature-jwt-token-refresh.md`
- Modalità sync "auto/ibrido/chiedi" non ancora collegati alle operazioni di modifica PDF (solo "differito" attivo)
- "Non chiedere più" nei dialog delete/conflitti (persistenza preferenza) non implementato
- Upload cloud: FileReader blob → verificare su APK reale

---

## Contesto

Al momento i PDF sono salvati solo localmente sul dispositivo (`Paths.document/pdfs/` + tabella SQLite `pdfs`). Alla disinstallazione/cancellazione dati si perdono tutti i PDF. Il sync cloud (F1) è pianificato dalla roadmap ma mai implementato.

Inoltre manca un wizard di primo avvio che guidi l'utente nella configurazione iniziale (permessi, tema, lingua, sync).

---

## Decisioni prese

### 1. Modalità sync — 4 opzioni selezionabili dall'utente

L'utente può scegliere in Settings come gestire il sync dopo ogni modifica:

| Opzione                 | Comportamento                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| **Differito** (default) | Le modifiche restano solo in locale. Sync parte solo ai trigger (avvio, background, manuale) |
| **Auto**                | Ogni upload/modifica/salvataggio fa immediatamente `uploadPdf()` su cloud                    |
| **Ibrido**              | Upload immediato solo se connesso al Wi-Fi. Se in mobile data, accoda                        |
| **Chiedi ogni volta**   | Dopo ogni modifica, mostra un dialog "Vuoi caricare subito su cloud?" con Sì/No/Ricorda      |

Persistere la scelta in AsyncStorage (chiave: `sync_mode`).

### 2. Sync all'avvio — condizionale + anteprima

- Eseguire sync condizionale: prima controllare se ci sono modifiche pendenti (queue non vuota, o `cloud_synced_at < updated_at` per qualche PDF, o PDF cloud non presenti in locale)
- **Se ci sono modifiche da sincronizzare**: mostrare all'utente una lista dei PDF coinvolti con l'operazione prevista (upload/download) prima di eseguire il sync. L'utente può confermare o rimandare.
- **Se non ci sono modifiche**: saltare sync, aprire Home normalmente
- L'utente deve anche poter attivare/disattivare questa funzionalità in Settings (toggle "Sync all'avvio")

### 3. Conflitti — lista con possibilità di switch vista

- Mostrare un singolo dialog riassuntivo "N PDF in conflitto" con una scroll list
- Ogni riga mostra i dettagli del conflitto (locale vs cloud) con pulsanti per scegliere
- **Tasto per cambiare vista**: un pulsante "Vista semplificata" / "Vista dettagliata" che alterna tra:
  - **Vista semplificata**: solo nome file + scelta rapida (Locale / Cloud) per ogni PDF
  - **Vista dettagliata**: nome file, dimensione, data modifica locale e cloud affiancati

---

## Componenti

### C1 — Onboarding wizard (prima installazione)

Alla prima installazione (nessun flag `onboarding_completed` in AsyncStorage), mostrare un wizard a step prima del LoginScreen:

**Step 1 — Benvenuto**

- Schermata splash/welcome con logo e descrizione app
- Pulsante "Inizia"
- Piccolo link "Salta" in alto a destra (per utenti che vogliono saltare il wizard e andare direttamente al login con le impostazioni predefinite)

**Step 2 — Permessi**

- Spiegare all'utente perché certi permessi servono (fotocamera per scanner, notifiche per badge)
- **Non richiedere i permessi qui** — su Android/iOS moderni i permessi si richiedono al primo utilizzo della feature (es. prima di aprire la fotocamera). Il wizard spiega solo a cosa servono.
- **Nota:** Il sync cloud NON richiede permessi extra — usa AppState per sync in background (nessun background fetch)
- Pulsante "Continua"

**Step 3 — Tema**

- Riprendere il selettore tema già implementato (S2)
- Scegliere: System default / Chiaro / Scuro
- Pulsante "Continua"

**Step 4 — Lingua**

- Riprendere il selettore lingua già implementato (S1)
- Scegliere: Lingua di sistema / Italiano / English
- Pulsante "Continua"

**Step 5 — Cloud Sync**

- Spiegare che il sync cloud permette di non perdere i PDF
- Toggle "Abilita sync cloud" (default: on)
- **Nota:** Il sync effettivo avviene solo dopo il login (utente guest non ha cloud). Qui si imposta solo la preferenza.
- Pulsante "Continua"

**Step 6 — Pronto**

- Riepilogo scelte
- Pulsante "Inizia a usare PdfEditor" → naviga al LoginScreen
- Salvare `onboarding_completed: true` in AsyncStorage

**Dopo il wizard**: non mostrare mai più (controllare `AsyncStorage.getItem("onboarding_completed")` in App.tsx o navigazione condizionale).

### C2 — Sync cloud PDF (F1)

**Backend (già esistente in `backend/app/api/v1/upload.py`):**

- `GET /pdfs` — lista PDF cloud dell'utente (con skip/limit)
- `POST /pdfs/upload` — caricare PDF (multipart, autenticato JWT)
- `GET /pdfs/{id}` — dettaglio di un PDF
- `GET /pdfs/{id}/download` — scaricare PDF (StreamingResponse)
- `DELETE /pdfs/{id}` — eliminare PDF dal cloud (per cancellazione sync)
- Autenticazione JWT necessaria (lato mobile usa cloud API via `api.ts`)

**Frontend mobile:**

- Nuovo hook `useCloudSync` con:
  - `uploadPdf(pdfId)` → upload singolo PDF su cloud
  - `downloadPdf(pdfId)` → scarica singolo PDF dal cloud e salva in locale
  - `syncAll()` → esegue sync **bidirezionale** completo:
    1. **Locale → Cloud**: PDF locali non ancora caricati **o modificati dopo l'ultimo sync** → upload
    2. **Cloud → Locale**: PDF cloud non presenti in locale → download
    3. **Conflitti**: PDF con stesso `id` ma `updated_at` diverso → mostra ConflictDialog
  - `getPendingChanges()` → restituisce lista dei PDF con modifiche pendenti (per anteprima sync all'avvio)
  - `status` → sync status per ogni PDF (pending/synced/error)
  - `syncEnabled` → preferenza utente
  - `syncMode` → "differito" | "auto" | "ibrido" | "chiedi"
  - `syncOnStartup` → boolean (toggle sync all'avvio)
  - `progress` → `{ current: number, total: number }` durante sync batch (per barra progresso)
  - `isOnline` → stato connettività (se offline, accoda e riprova)
- In `localDb.ts`: aggiungere colonne:
  - `cloud_synced` (boolean) — se il PDF è stato caricato sul cloud almeno una volta
  - `cloud_synced_at` (timestamp, nullable) — data dell'ultimo sync riuscito. Usata per rilevare se il PDF è stato modificato localmente dopo l'ultimo sync (confronto con `updated_at` locale).
- Stato sync visibile nella Home (icona cloud accanto a ogni PDF: ☁️ pending / ☁️✅ synced / ⚠️ error)
- **Feedback progresso**: Durante `syncAll()`, mostrare una barra di progresso o un contatore "Sincronizzazione in corso... (3/12)" invece di uno spinner generico

**Trigger di sync (4 modalità):**

1. **Manuale** — Pulsante "Sincronizza ora" in Settings (C3). Esegue `syncAll()` completo.
2. **All'avvio** — Solo se toggle "Sync all'avvio" è attivo. Esegue `getPendingChanges()` per controllare modifiche:
   - **Se non ci sono modifiche**: skip, apre Home normalmente
   - **Se ci sono modifiche**: mostra anteprima (lista PDF + operazioni upload/download), utente conferma o rimanda
3. **In background (AppState)** — Quando l'utente passa a un'altra app (`AppState → "background"`), trigger `syncAll()` bidirezionale. **Nessun permesso extra richiesto** — funziona con `AppState.addEventListener` di React Native, non necessita di `expo-background-fetch`.
4. **Dopo modifica** — Dipende dalla modalità sync scelta dall'utente:
   - **Differito** (default): nessun trigger immediato, solo i 3 trigger sopra
   - **Auto**: ogni upload/modifica/salvataggio → immediato `uploadPdf()` su cloud
   - **Ibrido**: upload immediato solo se Wi-Fi. Se mobile data, accoda
   - **Chiedi ogni volta**: dialog "Caricare subito su cloud?" con Sì/No/Ricorda

**Gestione errori e offline:**

- Se il dispositivo è offline durante un trigger di sync, i PDF da caricare vengono accodati in `useSyncQueue` (F6) con tipo `upload | delete | update`
- Alla prossima attivazione (avvio, background, o manuale), `processQueue()` ritenta l'operazione FIFO
- Se un singolo PDF fallisce (es. file corrotto), il sync continua con i successivi — l'errore viene registrato nello `status` del PDF
- **Sync parziale**: se durante `syncAll()` la connessione cade a metà, i PDF già processati rimangono sincronizzati. Quelli non ancora processati vengono riprocessati al prossimo trigger

> **Nota:** Sync periodico con app chiusa (tipo `expo-background-fetch`) è rimandato a future versioni. Richiederebbe permessi `BACKGROUND_FETCH` (iOS) e `WAKE_LOCK` (Android) con utilità limitata: i PDF cambiano solo quando l'utente li modifica attivamente.

**Risoluzione conflitti (bidirezionale):**

- **Matching**: I PDF usano UUID come PK sia in locale che sul cloud. Il match avviene per `id` UUID.
- **Casi possibili**:
  | Scenario | Azione |
  |----------|--------|
  | PDF solo in locale | Upload su cloud |
  | PDF solo sul cloud | Download in locale |
  | Stesso PDF (`id` match), stessa versione | Skip |
  | Stesso PDF, versioni diverse **(conflitto)** | Notificare l'utente e chiedere quale versione tenere |
- **Rilevamento conflitti**: `syncAll()` confronta per ogni PDF il `updated_at` locale con quello cloud. Se diversi, è un conflitto.
- **Quando si mostra**: I conflitti vengono rilevati durante `syncAll()` e raggruppati in una lista. Dopo aver completato i sync non conflittuali (upload/download semplici), se ci sono conflitti si mostra un singolo dialog riassuntivo.
- **Dialog conflitto (lista + vista alternabile)**:
  - Titolo: "N PDF in conflitto" con contatore
  - Pulsante in alto a destra: **"Vista semplificata" / "Vista dettagliata"** (alternabile on-the-fly)
  - **Vista semplificata**: ogni riga mostra nome file + due pulsanti "Locale" / "Cloud" per scegliere rapidamente
  - **Vista dettagliata**: ogni riga espansa mostra nome, dimensione, data modifica locale e cloud affiancati
  - Pulsante "Sempre locale" / "Sempre cloud" per riga (salva preferenza in AsyncStorage)
  - Pulsante "Applica tutto" in fondo per eseguire le scelte

**Import selettivo dopo login:**

- **Trigger**: Alla prima attivazione del sync dopo un **login reale** (non guest), se esistono PDF locali con `user_id` vuoto/null
- **UI**: Mostrare una lista con checkbox di tutti i PDF locali "orfani"
- **Azioni**:
  - "Importa selezionati" → associa all'utente e carica su cloud
  - "Salta" → rimanda. L'utente può ripescare la schermata da Settings → Cloud → "Gestisci PDF locali"
- **Dopo l'import**: i PDF selezionati vengono aggiornati in `localDb` con `user_id` e `cloud_synced = true` dopo upload riuscito

**Cancellazione con scelta (delete sync dialog):**

- **Condizione**: Il dialog si mostra SOLO se sync cloud è abilitato **e** il PDF è stato già caricato sul cloud (`cloud_synced = true`). Se sync è disabilitato o il PDF non è mai stato sincronizzato, si usa la normale cancellazione locale.
- **Opzioni**:
  - "Elimina solo dal dispositivo" — rimuove il file locale, lascia il cloud intatto
  - "Elimina solo dal cloud" — rimuove dal cloud, lascia il locale intatto (poi aggiorna `cloud_synced`)
  - "Elimina da entrambi" — rimuove ovunque (opzione predefinita)
  - "Non chiedere più e usa: [default: entrambi]" — checkbox per ricordare la scelta
- **Guest**: Il sync è disabilitato per utenti guest (non hanno un account cloud). La preferenza sync viene ignorata finché l'utente non fa login reale. Per i guest, la cancellazione è solo locale (nessun dialog).
- Logica gestita in `useCloudSync.syncAll()`

**Settings:**

- Nuova sezione "Cloud" con:
  - Toggle "Abilita sync cloud" (persistere in AsyncStorage)
  - **Modalità sync** (radio/segmented): Differito (default) / Auto / Ibrido / Chiedi ogni volta
  - **Toggle "Sync all'avvio"** — attiva/disattiva sync automatico all'apertura dell'app
  - Stato: "Sincronizzato", "N PDF in attesa", "Errore sync"
  - Pulsante "Sincronizza ora"
  - Pulsante "Gestisci PDF locali" (per import selettivo dopo login)
  - Pulsante "Ripristina preferenze sync" (cancella `sync_conflict_prefs` per riproporre i dialog di scelta)
  - Label informativa: "Il sync avviene all'avvio e quando l'app va in background"

### C3 — Reuse wizard scelte in Settings

Le scelte fatte nel wizard (tema, lingua, sync) devono riflettersi nelle impostazioni esistenti:

- Tema → già funziona via AppSettingsContext
- Lingua → già funziona via AppSettingsContext
- Sync → nuova opzione in SettingsScreen

---

## File coinvolti (stimati)

```
mobile/src/screens/OnboardingWizard.tsx     # C1 — wizard UI (nuovo)
mobile/src/screens/ConflictDialog.tsx        # C2 — dialog risoluzione conflitti (nuovo)
mobile/src/screens/ImportPdfDialog.tsx       # C2 — dialog import selettivo dopo login (nuovo)
mobile/src/screens/DeleteSyncDialog.tsx      # C2 — dialog cancellazione con scelta sync (nuovo)
mobile/src/shared/OnboardingContext.tsx      # C1 — contesto wizard (nuovo)
mobile/src/hooks/useCloudSync.ts            # C2 — hook sync (nuovo)
mobile/src/screens/SettingsScreen.tsx       # C2/C3 — opzione sync cloud
mobile/src/screens/HomeScreen.tsx           # C2 — icona cloud nei PDF + trigger dialog conflitto/import/cancellazione
mobile/src/services/localDb.ts              # C2 — colonne cloud_synced + cloud_synced_at
mobile/App.tsx                              # C1 — routing condizionale wizard + AppState listener sync background
mobile/src/navigation/AppNavigator.tsx      # C1 — schermata wizard nel navigator
mobile/src/i18n/en.json                     # C1/C2 — chiavi sync + wizard
mobile/src/i18n/it.json                     # C1/C2 — chiavi sync + wizard
mobile/package.json                         # dipendenza @react-native-community/netinfo
```

**Rimandato a future versioni:**

- Sync periodico con app chiusa (expo-background-fetch) — richiede BACKGROUND_FETCH (iOS) e WAKE_LOCK (Android)
- **Storage quota**: il cloud gratuito potrebbe avere limiti di storage. In futuro aggiungere un indicatore "Spazio cloud: 45MB / 100MB usati" in Settings.

---

## Dipendenze

- `useSyncQueue` hook (F6) — **già esistente** in `mobile/src/hooks/useSyncQueue.ts`. Supporta `enqueue`, `processQueue`, `clearQueue` con tipi `upload | delete | update`. **Riutilizzabile** per la coda sync offline.
- Endpoint cloud API già esistenti in `backend/app/api/v1/upload.py` (autenticazione JWT via `api.ts`)
- `@react-native-community/netinfo` — **da installare** via `npx expo install @react-native-community/netinfo`. Rileva connettività: se offline, accoda operazioni in `useSyncQueue` invece di fallire.
- AsyncStorage per flag `onboarding_completed`, preferenza sync, preferenze conflitto (chiave: `sync_conflict_prefs`)

---

## Ordine esecuzione suggerito

1. **C2** — `useCloudSync` hook + `localDb.ts` colonna `cloud_synced` + sync bidirezionale (core logico)
2. **C3** — SettingsScreen: sezione Cloud con toggle, stato, pulsante "Sincronizza ora"
3. **C1** — Onboarding wizard (dipende dalle impostazioni sync/tema/lingua già pronte)

---

## Status

[ ] Non iniziata
