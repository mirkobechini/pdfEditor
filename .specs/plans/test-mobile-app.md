# Test: Mobile App (React Native / Expo)

## Obiettivo

Coprire la logica business e i componenti dell'app mobile con test automatizzati, seguendo lo stesso standard del backend (~94% coverage) e frontend (~75% coverage).

## Stack test

- **Framework**: Jest (via `jest-expo`)
- **UI testing**: `@testing-library/react-native`
- **Mock**: fetch mock per API, AsyncStorage mock, expo-file-system mock

## Test pianificati

### 1. Logica pura (nessuna dipendenza RN) ✅ Completato (13 test, fix bug EMAIL_NOT_FOUND)

| Test                                                  | File                     | Priorità | Stato |
| ----------------------------------------------------- | ------------------------ | -------- | ----- |
| `error-map.ts` — mapError copre tutti i codici errore | `test/error-map.test.ts` | Alta     | ✅    |
| `error-map.ts` — extractErrorDetail funziona          | `test/error-map.test.ts` | Alta     | ✅    |
| `types.ts` — type check (solo compilazione)           | —                        | Bassa    | ❌    |

### 2. API client (con fetch mockato) ✅ Completato (13 test)

| Test                                                    | File               | Priorità | Stato |
| ------------------------------------------------------- | ------------------ | -------- | ----- |
| `api.login()` — chiamata e parsing risposta             | `test/api.test.ts` | Alta     | ✅    |
| `api.register()` — chiamata e gestione errore           | `test/api.test.ts` | Alta     | ✅    |
| `api.guestLogin()` — flusso guest                       | `test/api.test.ts` | Alta     | ✅    |
| `api.getMe()` — token valido e scaduto                  | `test/api.test.ts` | Alta     | ✅    |
| `api.listPdfs()` — lista PDF                            | `test/api.test.ts` | Media    | ✅    |
| `api.deletePdf()` — chiamata DELETE                     | `test/api.test.ts` | Media    | ✅    |
| `api.extractError()` — rate limit, JSON error, fallback | `test/api.test.ts` | Alta     | ✅    |
| `api.token()` — get/set token                           | `test/api.test.ts` | Alta     | ✅    |

### 3. Auth (con AsyncStorage mock)

| Test                                               | File                 | Priorità |
| -------------------------------------------------- | -------------------- | -------- |
| `AuthProvider` — restore session con token salvato | `test/auth.test.tsx` | Alta     |
| `AuthProvider` — restore session senza token       | `test/auth.test.tsx` | Alta     |
| `AuthProvider` — login e salvataggio token         | `test/auth.test.tsx` | Alta     |
| `AuthProvider` — guest login                       | `test/auth.test.tsx` | Alta     |
| `AuthProvider` — logout e pulizia token            | `test/auth.test.tsx` | Alta     |
| `AuthProvider` — loading state iniziale            | `test/auth.test.tsx` | Alta     |
| `AuthProvider` — safety timeout se offline         | `test/auth.test.tsx` | Media    |

### 4. Servizi PDF (con pdf-lib reale)

| Test                                        | File                      | Priorità |
| ------------------------------------------- | ------------------------- | -------- |
| `pdf-lib` merge due PDF                     | `test/pdfService.test.ts` | Alta     |
| `pdf-lib` split PDF in pagine               | `test/pdfService.test.ts` | Alta     |
| `pdf-lib` reorder pagine                    | `test/pdfService.test.ts` | Alta     |
| `pdf-lib` update metadata                   | `test/pdfService.test.ts` | Media    |
| `readPdfBytes` / `writePdfBytes` con base64 | `test/pdfService.test.ts` | Media    |

### 5. Database locale (expo-sqlite mock)

| Test                                  | File                   | Priorità |
| ------------------------------------- | ---------------------- | -------- |
| `savePdfLocally` — inserisce record   | `test/localDb.test.ts` | Alta     |
| `getLocalPdfs` — recupera tutti i PDF | `test/localDb.test.ts` | Alta     |
| `deleteLocalPdf` — rimuove record     | `test/localDb.test.ts` | Alta     |

### 6. Componenti UI (con @testing-library/react-native)

| Test                                        | File                           | Priorità |
| ------------------------------------------- | ------------------------------ | -------- |
| LoginScreen — rende form email/password     | `test/LoginScreen.test.tsx`    | Alta     |
| LoginScreen — tasto guest funzionante       | `test/LoginScreen.test.tsx`    | Alta     |
| LoginScreen — errore visibile su fallimento | `test/LoginScreen.test.tsx`    | Alta     |
| HomeScreen — lista PDF vuota                | `test/HomeScreen.test.tsx`     | Media    |
| HomeScreen — FAB apre menu                  | `test/HomeScreen.test.tsx`     | Media    |
| SettingsScreen — mostra info utente         | `test/SettingsScreen.test.tsx` | Bassa    |

### 7. Hook custom

| Test                                                       | File                         | Priorità |
| ---------------------------------------------------------- | ---------------------------- | -------- |
| `usePdfStorage.pickAndSavePdf()` — con mock DocumentPicker | `test/usePdfStorage.test.ts` | Media    |
| `usePdfStorage.loadLocalPdfs()` — con mock db              | `test/usePdfStorage.test.ts` | Media    |

## Setup necessario

```bash
npx expo install jest jest-expo @testing-library/react-native @testing-library/jest-native
```

Aggiungere a `package.json`:

```json
"scripts": {
  "test": "jest"
}
```

Configurare `jest.config.js`:

```js
module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@sentry/.*|pdf-lib|react-native-pdf|react-native-blob-util|react-native-reanimated)",
  ],
  setupFilesAfterSetup: ["@testing-library/jest-native/extend-expect"],
};
```

## Priorità di implementazione

1. **Alta** — error-map + api + auth (coprono logica critica, nessun mock RN complesso)
2. **Media** — pdfService + localDb + hook (richiedono mock file system / sqlite)
3. **Bassa** — UI components (richiedono @testing-library/react-native setup)

## Status

[ ] Non iniziata
