# Feature Comparison: Web vs Desktop vs Mobile

> **Ultimo aggiornamento:** 2026-10-07
> Questo file traccia le differenze funzionali tra le tre piattaforme di PdfEditor.

---

## Legenda

| Simbolo | Significato                |
| ------- | -------------------------- |
| ✅      | Implementato e funzionante |
| ❌      | Non implementato           |
| ⏸       | In pausa / bloccato        |
| 🟡      | Parziale (vedi note)       |
| ➖      | Non applicabile alla piattaforma |

---

## Tabella comparativa

| Funzionalità                        | Web | Desktop | Mobile | Note                                                                                                                                                                                   |
| ----------------------------------- | --- | ------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PDF CRUD**                        |     |         |        |                                                                                                                                                                                        |
| Upload PDF                          | ✅  | ✅      | ✅     | Mobile: da file system o scanner                                                                                                                                                       |
| List PDFs                           | ✅  | ✅      | ✅     |                                                                                                                                                                                        |
| Download PDF                        | ✅  | ✅      | ✅     | SAF storage access framework                                                                                                                                                           |
| Delete PDF                          | ✅  | ✅      | ✅     | Mobile: swipe-to-delete + multi-select                                                                                                                                                 |
| Dati PDF in lista (dimensione, data)| ✅  | ✅      | 🟡     | Web: sotto il nome nella sidebar (#968). Desktop: già presente. Mobile: solo dimensione e pagine, manca la data |
| **Editing PDF**                     |     |         |        |                                                                                                                                                                                        |
| Merge PDF                           | ✅  | ✅      | ✅     |                                                                                                                                                                                        |
| Split PDF                           | ✅  | ✅      | ✅     | Mobile: split interattivo (scegli pagine)                                                                                                                                              |
| Reorder pagine                      | ✅  | ✅      | ✅     | Mobile: pulsanti su/giù                                                                                                                                                                |
| Remove pagine                       | ✅  | ✅      | ✅     |                                                                                                                                                                                        |
| Replace text                        | ✅  | ✅      | ✅     | Web/desktop: aggiorna viewer, preserva font/size. Mobile: via cloud API                                                                                                                |
| Password protect                    | ✅  | ✅      | ✅     | Mobile: @cantoo/pdf-lib (fork con encrypt)                                                                                                                                             |
| Unlock PDF                          | ✅  | ✅      | ✅     |                                                                                                                                                                                        |
| Compressione PDF                    | ✅  | ✅      | ✅     | Web/desktop: PyMuPDF. Mobile: online → cloud API, offline → re-save pdf-lib (parziale) (issue #827)                                                                                    |
| Undo/Redo                           | ✅  | ✅      | ❌     | Solo backend (history)                                                                                                                                                                 |
| Cloud sync bidirezionale            | ➖  | ✅      | ✅     | Web è sempre cloud-native (nessuno storage locale da sincronizzare). Desktop/Mobile: `useCloudSync` — upload/download, conflitti, offline, sync su avvio                              |
| **Metadata**                        |     |         |        |                                                                                                                                                                                        |
| View metadata                       | ✅  | ✅      | ✅     | Mobile: dialog dettagli                                                                                                                                                                |
| Edit metadata                       | ✅  | ✅      | ✅     |                                                                                                                                                                                        |
| **Import/Export**                   |     |         |        |                                                                                                                                                                                        |
| Import file                         | ✅  | ✅      | ✅     | Web/Desktop online, Desktop offline (sidecar), Mobile online (richiede connessione)                                                                                                    |
| Import DOCX                         | ✅  | ✅      | ✅     | Web/Mobile online (python-docx+reportlab), Desktop offline (sidecar)                                                                                                                   |
| Export PDF                          | ✅  | ✅      | ✅     | Web/Desktop online, Desktop offline (sidecar), Mobile online (richiede connessione)                                                                                                    |
| Stampa PDF                          | ✅  | ✅      | ✅     | Web e Mobile ora a parità con desktop su pagine/orientamento: dialogo con anteprima live prima di passare al print nativo (browser/AirPrint). Solo Desktop ha stampante/copie/colore e stampa silenziosa (via PowerShell, nessun dialogo di sistema)                                            |
| Drag & drop file                    | ✅  | ✅      | ❌     | Web: trascina PDF per aprirlo, altri file per importarli (overlay feedback). Desktop: stesso comportamento via eventi Tauri (immagini normalizzate a PNG per GIF/BMP)                                                                                                       |
| Browse documents (Internet Archive) | ✅  | ❌      | ❌     | Solo Web: catalogo PDF reali da Internet Archive via microservizio pdf-documents-api (porta 8001)                                                                                      |
| Firma PDF                           | ✅  | ✅      | ✅     | Tutte e tre: flusso a 2 step (disegna/posiziona), colore inchiostro a scelta (nero/bianco/rosso/blu), anteprima della firma nel box mentre si sposta e ridimensiona, undo/redo. Web/Desktop: maniglia di resize in basso a destra. Mobile: disegno libero o galleria, zoom+pan. Backend: PyMuPDF (pro/enterprise) |
| Annotazioni PDF                     | ✅  | ✅      | ✅     | Web e Desktop: evidenzia/sottolinea/barrato/commento/testo. Mobile: implementata e testata via UI; sbloccata in produzione dopo il redeploy backend del 2026-09-28 (vedi KNOWN_ISSUES). Backend: PyMuPDF embedded (pro/enterprise)                                                                                      |
| OCR PDF scansionati                 | ✅  | ✅      | ✅     | Web e Desktop: riconosce testo con Tesseract (pytesseract), mostra caratteri riconosciuti. Mobile: stesso stato di Annotazioni — sbloccata dal redeploy backend del 2026-09-28. Backend: searchable PDF (pro/enterprise)                                                                                        |
| **Testo**                           |     |         |        |                                                                                                                                                                                        |
| Extract text                        | ✅  | ✅      | ❌     | Solo backend (PyMuPDF)                                                                                                                                                                 |
| **Auth**                            |     |         |        |                                                                                                                                                                                        |
| Email/password                      | ✅  | ✅      | ✅     |                                                                                                                                                                                        |
| Guest mode                          | ✅  | ✅      | ✅     |                                                                                                                                                                                        |
| Google OAuth                        | ✅  | ✅      | ✅     | Desktop: redirect flow via browser. Mobile: expo-auth-session (richiede client ID Android/iOS)                                                                                         |
| Forgot/reset password               | ✅  | ✅      | ✅     |                                                                                                                                                                                        |
| JWT token refresh                   | ✅  | ✅      | ✅     | Automatico su 401 (issue #623)                                                                                                                                                         |
| **UX Mobile-specifiche**            |     |         |        |                                                                                                                                                                                        |
| Scanner camera                      | ❌  | ❌      | ✅     | expo-camera                                                                                                                                                                            |
| Share PDF                           | ❌  | ❌      | ✅     | expo-sharing                                                                                                                                                                           |
| Share via link                      | ✅  | ✅      | ✅     | Web e Desktop: dialog Condividi + pagina pubblica /share/[token] (password/scadenza opzionali). Desktop/Mobile caricano prima il PDF sul cloud. Il link si apre solo nel browser: aprirlo nell'app è una feature futura (#992). In produzione /share/* richiede il rewrite su Render (#991) |
| Badge count icona                   | ❌  | ❌      | ✅     | expo-notifications                                                                                                                                                                     |
| Multi-select                        | ✅  | ✅      | ✅     | Web/Desktop: checkbox + batch delete/export. Mobile: checkbox + batch delete                                                                                                           |
| Splash screen                       | ❌  | ❌      | ✅     | Sfondo arancione                                                                                                                                                                       |
| Pull-to-refresh                     | ❌  | ❌      | ✅     | RefreshControl                                                                                                                                                                         |
| Search/filtro                       | ❌  | ❌      | ✅     | Searchbar + useMemo                                                                                                                                                                    |
| Swipe-to-delete                     | ❌  | ❌      | ✅     | react-native-gesture-handler                                                                                                                                                           |
| Snackbar notifiche                  | ❌  | ❌      | ✅     | React Native Paper                                                                                                                                                                     |
| Bottom tabs                         | ❌  | ❌      | ✅     | Home + Settings                                                                                                                                                                        |
| **UX Web/Desktop**                  |     |         |        |                                                                                                                                                                                        |
| Bug reports                         | ✅  | 🟡      | ✅     | Web: completo. Desktop: UI inline in Settings. Mobile: BugReportDialog in Settings                                                                                                     |
| License management                  | ✅  | ❌      | ❌     | Solo webapp                                                                                                                                                                            |
| Admin panel                         | ✅  | ❌      | ❌     | Solo webapp                                                                                                                                                                            |
| Guest → account conversion banner   | ✅  | ✅      | ✅     | Invita gli utenti guest a creare un account vero. Web/Desktop: `GuestConvertBanner`. Mobile: `GuestBanner`                                                                             |
| Dark mode                           | ✅  | ✅      | ✅     | Web/Desktop: toggle in `HeaderControls` + bootstrap script in `layout.tsx`. Mobile: preferenza in `AppSettingsContext`/Settings                                                        |
| Status page pubblica                | ✅  | ➖      | ➖     | Solo Web (`/status`): stato dei servizi (backend, storage). Non applicabile a Desktop/Mobile (nessun servizio da esporre pubblicamente)                                                |
| **Non implementato su nessuna**     |     |         |        |                                                                                                                                                                                        |
| **Cross-platform**                  |     |         |        |                                                                                                                                                                                        |
| Keep-warm backend                   | ✅  | ✅      | ❌     | GitHub Actions 24/7 + frontend keep-warm quando l'app è aperta                                                                                                                         |
| Icona origine piattaforma           | ✅  | ✅      | ✅     | 🌐 web, 💻 desktop, 📱 mobile — nessuna icona se dalla piattaforma corrente                                                                                                            |

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
- **Rispetto a web:** Stessa UI, Google OAuth attivo (redirect flow via browser di sistema)

### Mobile (`mobile/`)

- **Stack:** Expo SDK 57 (managed), React Native Paper, pdf-lib locale
- **Auth:** Email/password, guest, Google OAuth (expo-auth-session), forgot/reset password ✅, JWT refresh automatico ✅
- **Operazioni:** Locali con @cantoo/pdf-lib (nessun backend necessario). Compressione PDF: online → cloud API (PyMuPDF), offline → re-save pdf-lib (parziale, issue #827)
- **Cloud sync:** ✅ Bidirezionale con useCloudSync (upload/download, conflitti, offline)
- **Undo/Redo:** Non supportato (pdf-lib non ha history)
- **Download PDF:** ✅ tramite SAF (Storage Access Framework)
- **Solo mobile:** Scanner, Share, Badge, Multi-select, Splash, Pull-to-refresh, Search, Swipe, Snackbar, Bottom tabs, Onboarding wizard, Sync badges
- **Manca rispetto a web/desktop:** Extract text, Undo/Redo
- **Sbloccate dal redeploy backend del 2026-09-28:** Annotazioni, OCR, Share via link (codice completo e testato via UI; consigliata una riconferma rapida su device reale ora che il backend è aggiornato, dato che non sono state ritestate end-to-end dopo il deploy)

---

## Feature future (non implementate su nessuna piattaforma)

| Feature | Priorità | Note |
| ------- | -------- | ---- |
