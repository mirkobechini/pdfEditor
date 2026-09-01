# Feature Comparison: Web vs Desktop vs Mobile

> **Ultimo aggiornamento:** 2026-09-01
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

| Funzionalità                    | Web | Desktop | Mobile | Note                                                                                                                                                 |
| ------------------------------- | --- | ------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PDF CRUD**                    |     |         |        |                                                                                                                                                      |
| Upload PDF                      | ✅  | ✅      | ✅     | Mobile: da file system o scanner                                                                                                                     |
| List PDFs                       | ✅  | ✅      | ✅     |                                                                                                                                                      |
| Download PDF                    | ✅  | ✅      | ✅     | SAF storage access framework                                                                                                                         |
| Delete PDF                      | ✅  | ✅      | ✅     | Mobile: swipe-to-delete + multi-select                                                                                                               |
| **Editing PDF**                 |     |         |        |                                                                                                                                                      |
| Merge PDF                       | ✅  | ✅      | ✅     |                                                                                                                                                      |
| Split PDF                       | ✅  | ✅      | ✅     | Mobile: split interattivo (scegli pagine)                                                                                                            |
| Reorder pagine                  | ✅  | ✅      | ✅     | Mobile: pulsanti su/giù                                                                                                                              |
| Remove pagine                   | ✅  | ✅      | ✅     |                                                                                                                                                      |
| Replace text                    | ✅  | ✅      | ✅     | Web/desktop: aggiorna viewer, preserva font/size. Mobile: via cloud API                                                                                                                  |
| Password protect                | ✅  | ✅      | ✅     | Mobile: @cantoo/pdf-lib (fork con encrypt)                                                                                                           |
| Unlock PDF                      | ✅  | ✅      | ✅     |                                                                                                                                                      |
| Undo/Redo                       | ✅  | ✅      | ❌     | Solo backend (history)                                                                                                                               |
| **Metadata**                    |     |         |        |                                                                                                                                                      |
| View metadata                   | ✅  | ✅      | ✅     | Mobile: dialog dettagli                                                                                                                              |
| Edit metadata                   | ✅  | ✅      | ✅     |                                                                                                                                                      |
| **Import/Export**               |     |         |        |                                                                                                                                                      |
| Import file                     | ✅  | ✅      | ❌     |                                                                                                                                                      |
| Export PDF                      | ✅  | ✅      | ❌     |                                                                                                                                                      |
| **Testo**                       |     |         |        |                                                                                                                                                      |
| Extract text                    | ✅  | ✅      | ❌     | Solo backend (PyMuPDF)                                                                                                                               |
| **Auth**                        |     |         |        |                                                                                                                                                      |
| Email/password                  | ✅  | ✅      | ✅     |                                                                                                                                                      |
| Guest mode                      | ✅  | ✅      | ✅     |                                                                                                                                                      |
| Google OAuth                    | ✅  | ✅      | ❌     | Desktop: funzionante con redirect flow via browser di sistema                                                                                        |
| Forgot/reset password           | ✅  | ✅      | ✅     |                                                                                                                                                      |
| JWT token refresh               | ✅  | ✅      | ✅     | Automatico su 401 (issue #623)                                                                                                                       |
| **UX Mobile-specifiche**        |     |         |        |                                                                                                                                                      |
| Scanner camera                  | ❌  | ❌      | ✅     | expo-camera                                                                                                                                          |
| Share PDF                       | ❌  | ❌      | ✅     | expo-sharing                                                                                                                                         |
| Badge count icona               | ❌  | ❌      | ✅     | expo-notifications                                                                                                                                   |
| Multi-select                    | ❌  | ❌      | ✅     | Checkbox + batch delete                                                                                                                              |
| Splash screen                   | ❌  | ❌      | ✅     | Sfondo arancione                                                                                                                                     |
| Pull-to-refresh                 | ❌  | ❌      | ✅     | RefreshControl                                                                                                                                       |
| Search/filtro                   | ❌  | ❌      | ✅     | Searchbar + useMemo                                                                                                                                  |
| Swipe-to-delete                 | ❌  | ❌      | ✅     | react-native-gesture-handler                                                                                                                         |
| Snackbar notifiche              | ❌  | ❌      | ✅     | React Native Paper                                                                                                                                   |
| Bottom tabs                     | ❌  | ❌      | ✅     | Home + Settings                                                                                                                                      |
| **UX Web/Desktop**              |     |         |        |                                                                                                                                                      |
| Bug reports                     | ✅  | ❌      | ❌     | Solo webapp                                                                                                                                          |
| License management              | ✅  | ❌      | ❌     | Solo webapp                                                                                                                                          |
| Admin panel                     | ✅  | ❌      | ❌     | Solo webapp                                                                                                                                          |
| **Non implementato su nessuna** |     |         |        |                                                                                                                                                      |
| Compressione PDF                | ❌  | ❌      | ❌     | Solo in roadmap                                                                                                                                      |
| Cloud sync                      | ✅  | ✅      | ✅     | Web: funzionante via API cloud. Desktop: bidirezionale con useCloudSync + mappa persistente localId→cloudId. Mobile: bidirezionale con useCloudSync. |
| Rework UI Penpot                | ❌  | ❌      | ❌     | Design da fare                                                                                                                                       |
| Rework UI Penpot                | ❌  | ❌      | ❌     | Design da fare                                                                                                                                       |
| **Cross-platform**              |     |         |        |                                                                                                                                                      |
| Keep-warm backend               | ✅  | ✅      | ❌     | GitHub Actions 24/7 + frontend keep-warm quando l'app è aperta                                                                                       |
| Icona origine piattaforma       | ✅  | ✅      | ✅     | 🌐 web, 💻 desktop, 📱 mobile — nessuna icona se dalla piattaforma corrente                                                                          |

---

## Dettaglio per piattaforma

### Web (`frontend/`)

- **Stack:** Next.js (static export) + backend FastAPI cloud
- **Auth:** Email/password, guest, Google OAuth, JWT refresh automatico ✅
- **Operazioni:** Tutte via API cloud (PyMuPDF sul backend)
- **Undo/Redo:** Supportato (history sul backend)
- **Solo web:** Admin panel, license management, bug reports

### Desktop (`desktop/`)

- **Stack:** Tauri v2 + Next.js static export + sidecar FastAPI (PyInstaller)
- **Auth:** Email/password, guest, Google OAuth (redirect flow via browser di sistema), JWT refresh automatico ✅
- **Operazioni:** Sidecar locale (PyMuPDF) + cloud per auth
- **Undo/Redo:** Supportato (history sul sidecar)
- **Rispetto a web:** Stessa UI, Google OAuth non attivo

### Mobile (`mobile/`)

- **Stack:** Expo SDK 57 (managed), React Native Paper, pdf-lib locale
- **Auth:** Email/password, guest (no Google OAuth), forgot/reset password ✅, JWT refresh automatico ✅
- **Operazioni:** Tutte locali con @cantoo/pdf-lib (nessun backend necessario)
- **Cloud sync:** ✅ Bidirezionale con useCloudSync (upload/download, conflitti, offline)
- **Undo/Redo:** Non supportato (pdf-lib non ha history)
- **Download PDF:** ✅ tramite SAF (Storage Access Framework)
- **Solo mobile:** Scanner, Share, Badge, Multi-select, Splash, Pull-to-refresh, Search, Swipe, Snackbar, Bottom tabs, Onboarding wizard, Sync badges
- **Manca rispetto a web/desktop:** Replace text, Extract text, Import/Export, Undo/Redo, Google OAuth, Bug reports

---

## Feature future (non implementate su nessuna piattaforma)

| Feature                  | Priorità | Note                                     |
| ------------------------ | -------- | ---------------------------------------- |
| Compressione PDF         | Media    | PyMuPDF (web/desktop) + pdf-lib (mobile) |
| Cloud sync bidirezionale | Media    | Hook useSyncQueue già pronto su mobile   |
| Rework UI (Penpot)       | Alta     | Design da completare                     |
