# Feature: Mobile bug fixes + Settings improvements (issue 622)

## Obiettivo

Fixare i bug introdotti nell'ultima release mobile e aggiungere funzionalità mancanti in Settings.

---

## Bug da fixare

### B1 — Upload PDF rotto + Home non mostra file ✅

**Sintomo:** Dopo l'aggiornamento, la Home non mostra i PDF esistenti e l'upload apparentemente non carica nulla.

**Fix:** Modificare `getLocalPdfs()` per restituire TUTTI i PDF quando userId è vuoto/guest.

**Status:** ✅ Completato

### B2 — Pulsante multi-select visibile con 0 file ✅

**Sintomo:** Il pulsante "seleziona" (checkbox-multiple-marked-outline) nella Home è visibile anche quando non ci sono PDF caricati.

**Fix:** Mostrare l'icona multi-select solo se `pdfs.length > 0`.

**Status:** ✅ Completato

### B3 — Versione Settings ancora 0.1.0 ✅

**Sintomo:** In Settings → App → Version mostra `0.1.0` invece di `0.2.0`.

**Fix:** Leggere la versione da `expo-constants`.

**Status:** ✅ Completato

---

## Nuove feature Settings

### S1 — Lingua automatica + selettore lingua ✅

**Comportamento:**

- All'avvio: rilevare la lingua di sistema del dispositivo
- In Settings: radio per cambiare lingua (Italiano / English / System)
- Il cambio lingua è immediato su tutti gli schermi (Home, Tools, Login, ForgotPassword, Settings, navigazione)
- Persistere la scelta in AsyncStorage

**Status:** ✅ Completato

### S2 — Tema chiaro/scuro ✅

**Comportamento:**

- Seguire il tema di sistema per default (light/dark)
- In Settings: radio per forzare light, dark, o system default
- Persistere in AsyncStorage
- Cambio tema live senza refresh

**Status:** ✅ Completato

---

## Extra completati in questa issue

- Login overlay (semi-transparent black veil + ActivityIndicator)
- Error messages formattati via mapError + i18n
- Fix encoding caratteri in it.json (doppia codifica utf-8)
- Traduzioni complete su tutti gli schermi (HomeScreen, ToolsScreen, LoginScreen, ForgotPasswordScreen)
- Header navigazione tradotti (PDF Tools, Scanner, ForgotPassword, PdfViewer)
- Titolo app "PdfEditor" → "Editor" nei file i18n

---

## 🚩 Work remaining (fuori scope issue 622)

- **Replace text:** Segnalato come rotto su TUTTE le piattaforme in FEATURE_COMPARISON.md
- **Scanner su desktop/web need workaround per fotocamera**
- **Swipe-to-delete su HomeScreen:** Implementato ma non ancora verificato su tutti i dispositivi
- **Badge count su iOS:** Da testare (push notifiche permessi)
- **Upload cloud:** Caricare PDF sul cloud backend oltre che locale
- **Tema scuro su LoginScreen/ForgotPasswordScreen:** I background color dei container errori (hardcoded #FFE0E0) potrebbero non adattarsi al tema scuro

---

## File modificati in questa issue

```
mobile/src/screens/HomeScreen.tsx         # B1 + B2 + i18n
mobile/src/screens/ToolsScreen.tsx         # i18n
mobile/src/screens/LoginScreen.tsx         # i18n + overlay
mobile/src/screens/ForgotPasswordScreen.tsx # i18n
mobile/src/screens/SettingsScreen.tsx      # B3 + S1 + S2
mobile/src/navigation/AppNavigator.tsx     # i18n header titoli
mobile/src/navigation/MainTabs.tsx         # i18n tab labels
mobile/src/shared/auth.tsx                 # actionLoading split
mobile/src/shared/AppSettingsContext.tsx    # S1 + S2 (theme + locale)
mobile/src/theme.ts                        # S2 (nuovo, palette chiaro/scuro)
mobile/src/i18n/en.json                    # S1 (risorse inglese)
mobile/src/i18n/it.json                    # S1 (risorse italiano)
mobile/src/i18n/index.ts                   # S1 (config i18n)
mobile/src/services/localDb.ts             # B1
mobile/App.tsx                             # S1 + S2 (PaperProvider + i18n init)
mobile/package.json                        # dipendenze (expo-localization, i18next, etc.)
```
