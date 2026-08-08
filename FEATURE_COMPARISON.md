# Feature Comparison: Web vs Desktop vs Mobile

> **Ultimo aggiornamento:** 2026-08-08
> Questo file traccia le differenze funzionali tra le tre piattaforme di PdfEditor.

---

## Legenda

| Simbolo | Significato                |
| ------- | -------------------------- |
| ✅      | Implementato e funzionante |
| ❌      | Non implementato           |
| ⏸       | In pausa / bloccato        |
| 🟡      | Parziale (vedi note)       |

---

## Tabella comparativa

| Funzionalità                    | Web | Desktop | Mobile | Note                                       |
| ------------------------------- | --- | ------- | ------ | ------------------------------------------ |
| **PDF CRUD**                    |     |         |        |                                            |
| Upload PDF                      | ✅  | ✅      | ✅     | Mobile: da file system o scanner           |
| List PDFs                       | ✅  | ✅      | ✅     |                                            |
| Download PDF                    | ✅  | ✅      | ❌     | Mobile: i PDF sono già locali              |
| Delete PDF                      | ✅  | ✅      | ✅     | Mobile: swipe-to-delete + multi-select     |
| **Editing PDF**                 |     |         |        |                                            |
| Merge PDF                       | ✅  | ✅      | ✅     |                                            |
| Split PDF                       | ✅  | ✅      | ✅     | Mobile: split interattivo (scegli pagine)  |
| Reorder pagine                  | ✅  | ✅      | ✅     | Mobile: pulsanti su/giù                    |
| Remove pagine                   | ✅  | ✅      | ✅     |                                            |
| Replace text                    | ✅  | ✅      | ❌     | Solo backend (PyMuPDF)                     |
| Password protect                | ✅  | ✅      | ✅     | Mobile: @cantoo/pdf-lib (fork con encrypt) |
| Unlock PDF                      | ✅  | ✅      | ✅     |                                            |
| Undo/Redo                       | ✅  | ✅      | ❌     | Solo backend (history)                     |
| **Metadata**                    |     |         |        |                                            |
| View metadata                   | ✅  | ✅      | ✅     | Mobile: dialog dettagli                    |
| Edit metadata                   | ✅  | ✅      | ✅     |                                            |
| **Import/Export**               |     |         |        |                                            |
| Import file                     | ✅  | ✅      | ❌     |                                            |
| Export PDF                      | ✅  | ✅      | ❌     |                                            |
| **Testo**                       |     |         |        |                                            |
| Extract text                    | ✅  | ✅      | ❌     | Solo backend (PyMuPDF)                     |
| **Auth**                        |     |         |        |                                            |
| Email/password                  | ✅  | ✅      | ✅     |                                            |
| Guest mode                      | ✅  | ✅      | ✅     |                                            |
| Google OAuth                    | ✅  | ❌      | ❌     | Desktop: commentato, non attivo            |
| Forgot/reset password           | ✅  | ✅      | ❌     | Mobile: non implementato                   |
| **UX Mobile-specifiche**        |     |         |        |                                            |
| Scanner camera                  | ❌  | ❌      | ✅     | expo-camera                                |
| Share PDF                       | ❌  | ❌      | ✅     | expo-sharing                               |
| Badge count icona               | ❌  | ❌      | ✅     | expo-notifications                         |
| Multi-select                    | ❌  | ❌      | ✅     | Checkbox + batch delete                    |
| Splash screen                   | ❌  | ❌      | ✅     | Sfondo arancione                           |
| Pull-to-refresh                 | ❌  | ❌      | ✅     | RefreshControl                             |
| Search/filtro                   | ❌  | ❌      | ✅     | Searchbar + useMemo                        |
| Swipe-to-delete                 | ❌  | ❌      | ✅     | react-native-gesture-handler               |
| Snackbar notifiche              | ❌  | ❌      | ✅     | React Native Paper                         |
| Bottom tabs                     | ❌  | ❌      | ✅     | Home + Settings                            |
| **UX Web/Desktop**              |     |         |        |                                            |
| Bug reports                     | ✅  | ✅      | ❌     |                                            |
| License management              | ✅  | ✅      | ❌     | Solo backend                               |
| Admin panel                     | ✅  | ✅      | ❌     | Solo backend                               |
| **Non implementato su nessuna** |     |         |        |                                            |
| Compressione PDF                | ❌  | ❌      | ❌     | Solo in roadmap                            |
| Cloud sync                      | ❌  | ❌      | ❌     | Hook useSyncQueue pronto su mobile         |
| Rework UI Penpot                | ❌  | ❌      | ❌     | Design da fare                             |

---

## Dettaglio per piattaforma

### Web (`frontend/`)

- **Stack:** Next.js (static export) + backend FastAPI cloud
- **Auth:** Email/password, guest, Google OAuth
- **Operazioni:** Tutte via API cloud (PyMuPDF sul backend)
- **Undo/Redo:** Supportato (history sul backend)
- **Solo web:** Google OAuth funzionante, admin panel, license management, bug reports

### Desktop (`desktop/`)

- **Stack:** Tauri v2 + Next.js static export + sidecar FastAPI (PyInstaller)
- **Auth:** Email/password, guest (Google OAuth commentato nel codice)
- **Operazioni:** Sidecar locale (PyMuPDF) + cloud per auth
- **Undo/Redo:** Supportato (history sul sidecar)
- **Rispetto a web:** Stessa UI, Google OAuth non attivo

### Mobile (`mobile/`)

- **Stack:** Expo SDK 57 (managed), React Native Paper, pdf-lib locale
- **Auth:** Email/password, guest (no Google OAuth, no forgot/reset password)
- **Operazioni:** Tutte locali con @cantoo/pdf-lib (nessun backend necessario)
- **Undo/Redo:** Non supportato (pdf-lib non ha history)
- **Solo mobile:** Scanner, Share, Badge, Multi-select, Splash, Pull-to-refresh, Search, Swipe, Snackbar, Bottom tabs
- **Manca rispetto a web/desktop:** Replace text, Extract text, Import/Export, Undo/Redo, Google OAuth, Forgot/reset password, Bug reports

---

## Feature future (non implementate su nessuna piattaforma)

| Feature                  | Priorità | Note                                     |
| ------------------------ | -------- | ---------------------------------------- |
| Compressione PDF         | Media    | PyMuPDF (web/desktop) + pdf-lib (mobile) |
| Cloud sync bidirezionale | Media    | Hook useSyncQueue già pronto su mobile   |
| Rework UI (Penpot)       | Alta     | Design da completare                     |
