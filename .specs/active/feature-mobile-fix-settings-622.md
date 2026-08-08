# Feature: Mobile bug fixes + Settings improvements (issue 622)

## Obiettivo

Fixare i bug introdotti nell'ultima release mobile e aggiungere funzionalità mancanti in Settings.

---

## Bug da fixare

### B1 — Upload PDF rotto + Home non mostra file

**Sintomo:** Dopo l'aggiornamento, la Home non mostra i PDF esistenti e l'upload apparentemente non carica nulla.

**Analisi preliminare:** L'isolamento per `user_id` in `getLocalPdfs(userId)` potrebbe causare mismatch: se l'utente ha salvato PDF senza `user_id` (es. versione precedente) e ora si passa un `userId` diverso (es. stringa vuota `""` guest vs `"guest"`), i PDF non vengono trovati.

**Fix:** Modificare `getLocalPdfs()` per:
1. Se `userId` è vuoto/guest → restituire TUTTI i PDF (non filtrare)
2. Oppure fare fallback: se `userId` è presente usalo, altrimenti mostra tutti
3. Assicurarsi che `pickAndSavePdf()` salvi con `user_id` corretto

**File:**
- `mobile/src/services/localDb.ts` — funzione `getLocalPdfs()`
- `mobile/src/hooks/usePdfStorage.ts` — `pickAndSavePdf()` passaggio userId
- `mobile/src/screens/HomeScreen.tsx` — loadPdfs chiamata

### B2 — Pulsante multi-select visibile con 0 file

**Sintomo:** Il pulsante "seleziona" (checkbox-multiple-marked-outline) nella Home è visibile anche quando non ci sono PDF caricati.

**Fix:** Mostrare l'icona multi-select solo se `pdfs.length > 0`.

**File:** `mobile/src/screens/HomeScreen.tsx`

### B3 — Versione Settings ancora 0.1.0

**Sintomo:** In Settings → App → Version mostra `0.1.0` invece di `0.2.0`.

**Fix:** Leggere la versione da `expo-constants` (che legge `app.json`/`app.config.js`) invece di hardcodarla.

**File:**
- `mobile/src/screens/SettingsScreen.tsx`

---

## Nuove feature Settings

### S1 — Lingua automatica + selettore lingua

**Comportamento:**
- All'avvio: rilevare la lingua di sistema del dispositivo (es. `it-IT`, `en-US`)
- Se supportata, usare quella. Fallback: `en`
- In Settings: dropdown/radio per cambiare lingua manualmente (Italiano / English)
- Persistere la scelta in AsyncStorage
- Il cambio lingua deve essere immediato (non serve refresh)

**Dipendenze:**
- `expo-localization` (per rilevare lingua sistema)
- `next-intl` o alternativa RN → già c'è `i18n` o simile? Da verificare.
- Alternativa: usare `i18next` con `react-i18next` (leggero)

**File:**
- `mobile/package.json` (aggiungere dipendenze)
- Nuovo file: `mobile/src/i18n/` con configurazione
- `mobile/src/screens/SettingsScreen.tsx` (selettore lingua)
- `mobile/App.tsx` (inizializzazione i18n)
- `mobile/src/shared/auth.tsx` o nuovo hook per persisted locale

### S2 — Tema chiaro/scuro

**Comportamento:**
- Seguire il tema di sistema per default (light/dark)
- In Settings: toggle per forzare light, dark, o system default
- Persistere in AsyncStorage

**Dipendenze:**
- React Native Paper supporta già tema via `Provider` con `theme` prop
- Servono 2 palette (chiara + scura)

**File:**
- `mobile/App.tsx` (adattare PaperProvider con tema dinamico)
- `mobile/src/theme.ts` (definire palette chiaro/scuro)
- `mobile/src/screens/SettingsScreen.tsx` (toggle tema)

---

## File coinvolti

```
mobile/src/screens/HomeScreen.tsx         # B1 + B2
mobile/src/screens/SettingsScreen.tsx      # B3 + S1 + S2
mobile/src/services/localDb.ts             # B1
mobile/src/hooks/usePdfStorage.ts          # B1
mobile/App.tsx                             # S1 + S2
mobile/src/theme.ts                        # S2 (nuovo)
mobile/src/i18n/                           # S1 (nuova cartella)
mobile/package.json                        # dipendenze
```

---

## Ordine esecuzione

1. B1 — Fix upload/visibilità PDF
2. B2 — Nascondi multi-select quando 0 file
3. B3 — Fix versione dinamica
4. S1 — Lingua: rilevamento sistema + selettore Settings
5. S2 — Tema: chiaro/scuro + selettore Settings