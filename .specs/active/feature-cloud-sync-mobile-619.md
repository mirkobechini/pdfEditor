# Feature: Cloud sync PDF mobile + Onboarding wizard (issue #619)

## Obiettivo

Permettere all'utente mobile di sincronizzare i propri PDF con il cloud backend e introdurre un onboarding wizard alla prima installazione.

---

## Contesto

Al momento i PDF sono salvati solo localmente sul dispositivo (`Paths.document/pdfs/` + tabella SQLite `pdfs`). Alla disinstallazione/cancellazione dati si perdono tutti i PDF. Il sync cloud (F1) è pianificato dalla roadmap ma mai implementato.

Inoltre manca un wizard di primo avvio che guidi l'utente nella configurazione iniziale (permessi, tema, lingua, sync).

---

## Componenti

### C1 — Onboarding wizard (prima installazione)

Alla prima installazione (nessun flag `onboarding_completed` in AsyncStorage), mostrare un wizard a step prima del LoginScreen:

**Step 1 — Benvenuto**
- Schermata splash/welcome con logo e descrizione app
- Pulsante "Inizia"

**Step 2 — Permessi**
- Richiedere permessi: notifiche (per badge count), fotocamera (per scanner)
- Mostrare cosa serve ciascun permesso
- Pulsante "Concedi" / "Salta"

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
- Pulsante "Continua"

**Step 6 — Pronto**
- Riepilogo scelte
- Pulsante "Inizia a usare PdfEditor" → naviga al LoginScreen
- Salvare `onboarding_completed: true` in AsyncStorage

**Dopo il wizard**: non mostrare mai più (controllare `AsyncStorage.getItem("onboarding_completed")` in App.tsx o navigazione condizionale).

### C2 — Sync cloud PDF (F1)

**Backend (già esistente):**
- Endpoint `POST /pdfs/upload` — caricare PDF
- Endpoint `GET /pdfs/` — lista PDF cloud
- Endpoint `GET /pdfs/{id}/download` — scaricare PDF
- Autenticazione JWT necessaria (lato mobile usa cloud API)

**Frontend mobile:**
- Nuovo hook `useCloudSync` con:
  - `uploadPdf(pdfId)` → carica su cloud
  - `downloadPdf(pdfId)` → scarica e salva in locale
  - `syncAll()` → sincronizza tutti i PDF locali non ancora caricati
  - `status` → sync status per ogni PDF (pending/synced/error)
  - `syncEnabled` → preferenza utente
- In `localDb.ts`: aggiungere colonna `cloud_synced` (boolean) alla tabella `pdfs`
- Stato sync visibile nella Home (icona cloud accanto a ogni PDF: ☁️ pending / ☁️✅ synced / ⚠️ error)

**Settings:**
- Nuova sezione "Cloud" con:
  - Toggle "Abilita sync cloud" (persistere in AsyncStorage)
  - Stato: "Sincronizzato", "N PDF in attesa", "Errore sync"
  - Pulsante "Sincronizza ora"

### C3 — Reuse wizard scelte in Settings

Le scelte fatte nel wizard (tema, lingua, sync) devono riflettersi nelle impostazioni esistenti:
- Tema → già funziona via AppSettingsContext
- Lingua → già funziona via AppSettingsContext
- Sync → nuova opzione in SettingsScreen

---

## File coinvolti (stimati)

```
mobile/src/screens/OnboardingWizard.tsx     # C1 — wizard UI (nuovo)
mobile/src/shared/OnboardingContext.tsx     # C1 — contesto wizard (nuovo)
mobile/src/hooks/useCloudSync.ts            # C2 — hook sync (nuovo)
mobile/src/screens/SettingsScreen.tsx       # C2/C3 — opzione sync cloud
mobile/src/services/localDb.ts              # C2 — colonna cloud_synced
mobile/App.tsx                              # C1 — routing condizionale wizard
mobile/src/navigation/AppNavigator.tsx      # C1 — schermata wizard nel navigator
mobile/src/i18n/en.json                     # C1/C2 — chiavi sync + wizard
mobile/src/i18n/it.json                     # C1/C2 — chiavi sync + wizard
```

---

## Dipendenze

- `useSyncQueue` hook (F6) — già creato in issue #618, verificare se riutilizzabile per coda sync
- Endpoint cloud API già esistenti (autenticazione JWT via api.ts)
- AsyncStorage per flag `onboarding_completed` e preferenza sync

---

## Ordine esecuzione suggerito

1. C1 — Onboarding wizard (UI + routing + persistenza)
2. C3 — Settings opzione sync (toggle + stato + sincronizza ora)
3. C2 — useCloudSync hook + localDb colonna + sync effettivo

---

## Status

[ ] Non iniziata