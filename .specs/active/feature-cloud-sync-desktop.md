# Feature: Cloud sync desktop — sincronizzazione PDF con cloud backend

**Status:** Non iniziata
**Priority:** ALTA
**Complexity:** Media
**Estimated Time:** 2-3 giorni

---

## Obiettivo

Permettere al desktop (Tauri + sidecar) di sincronizzare i PDF con il cloud backend, esattamente come fa già il mobile. Attualmente il desktop usa il cloud solo per l'auth, non per i PDF.

## Contesto

- Il **mobile** ha già il cloud sync bidirezionale (useCloudSync, issue #619)
- Il **desktop** ha un sidecar FastAPI locale con SQLite e storage locale
- Il **web** è già sul cloud
- Il backend cloud (`https://pdfeditor-api.mirkobechini.com`) ha già tutti gli endpoint necessari (upload, list, download, delete)
- Il `shared/src/api.ts` ha già `cloudApi` (puntato al cloud) e `api` (puntato al sidecar locale)

## Cosa manca

### D1 — Hook useCloudSync per desktop

**File:** `desktop/frontend/src/hooks/useCloudSync.ts` (nuovo)

- Copiare/adattare la logica di `mobile/src/hooks/useCloudSync.ts` per il desktop
- Differenze dal mobile:
  - Invece di `expo-file-system`, usare `fetch` + Blob (già disponibile in Next.js)
  - Invece di `AsyncStorage`, usare `localStorage` (già disponibile)
  - Invece di `NetInfo`, usare `navigator.onLine` + evento `online`/`offline`
  - Invece di SQLite locale, usare le API del sidecar (già esistenti via `api.ts`)

### D2 — UI Sync in Settings

**File:** `desktop/frontend/src/app/settings/page.tsx`

- Aggiungere sezione Cloud Sync (come in mobile SettingsScreen)
- Toggle sync on/off
- Pulsante "Sync now"
- Stato connessione
- Badge sync nei PDF list

### D3 — Sync badge in PDF list

**File:** `desktop/frontend/src/app/app/page.tsx` (o componente lista PDF)

- Mostrare icona cloud (synced/pending/error) per ogni PDF
- Stessa logica del mobile

## Dipendenze

- Nessuna nuova libreria — tutto già disponibile in Next.js/browser

## File coinvolti

```
desktop/frontend/src/hooks/useCloudSync.ts    # D1 — nuovo hook
desktop/frontend/src/app/settings/page.tsx     # D2 — UI sync
desktop/frontend/src/app/app/page.tsx          # D3 — sync badges
shared/src/api.ts                              # già pronto (cloudApi)
```

## Test

- Test manuale: upload da desktop → visibile su webapp e mobile
- Test manuale: upload da mobile → visibile su desktop
- Test manuale: sync offline → messaggio chiaro

## Ordine esecuzione

1. **D1** — Hook useCloudSync per desktop
2. **D2** — UI Sync in Settings
3. **D3** — Sync badge in PDF list
4. Test end-to-end

---

## Status

[ ] Non iniziata
