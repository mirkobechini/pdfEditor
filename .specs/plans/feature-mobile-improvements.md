# Feature: Mobile app migliorie post-MVP (issue 618)

## Obiettivo
Migliorie UX e funzionalità mancanti dopo il completamento del MVP mobile.

---

## ✅ Già completato (issue #611 + #614 + #617)
- Auth guest + email/password + register + logout
- Offline restore utente (cache in AsyncStorage)
- Upload PDF da file system
- Home con lista PDF + FAB
- PDF Viewer con zoom e navigazione pagine
- Scanner fotocamera → PDF (con naming opzionale)
- Tools: Merge, Split (scegli pagine), Reorder (pulsanti su/giù), Remove pages
- Naming PDF dopo merge/split/reorder/remove
- Password visibility toggle (occhio)
- Settings in header Home (icona ingranaggio)
- Tools in header Home (icona file-document-multiple)
- Long-press in Home (rinomina, elimina, dettagli)
- Login overlay con spinner semitrasparente
- Errore login visibile (box rosso)
- Dark/Light theme (basato su system color scheme)
- Tema arancione PaperProvider (bottoni non più viola)
- Icona app aggiornata (senza sfondo bianco)
- Loading spinner AppNavigator (auth restore)
- 47 test
- Hook useCameraScanner (estratto da ScannerScreen)
- useSafeAreaInsets per FAB
- expo-font, @expo/vector-icons, expo-worklets
- Dynamic import → static import in pdfService e Scanner

---

## 🐛 Bug aperti
| # | Bug | Note |
|---|-----|------|
| B1 | Secondo PDF non apre | refreshKey fix da testare |
| B2 | Login cold-start lento (Render) | Timeout 30s, messaggio chiaro |

---

## 📋 Task future (in ordine di esecuzione)

### 1. Metadata editing (titolo/autore)
- [ ] Aggiungere dialog in ToolsScreen per modificare titolo e autore
- [ ] Usare `updateMetadata` già presente in pdfService.ts

### 2. Password protect/unlock PDF
- [ ] Aggiungere dialog per impostare/rimuovere password
- [ ] Usare pdf-lib (PDFDocument.encrypt/decrypt)

### 3. Hook useSyncQueue (background)
- [ ] Creare hook per coda di operazioni da sincronizzare col cloud
- [ ] Eseguire sync in background quando c'è connessione
- [ ] Struttura già predisposta in localDb

### 4. Refresh-to-reload in Home
- [ ] Aggiungere pull-to-refresh in HomeScreen

### 5. Search/filter in Home
- [ ] Aggiungere barra di ricerca sopra la lista PDF
- [ ] Filtrare per nome file

### 6. Preview thumbnail in Home
- [ ] Estrarre prima pagina del PDF e mostrare thumbnail

### 7. Toast/notifiche dopo operazioni
- [ ] Sostituire testi "result" in ToolsScreen con Snackbar

### 8. Swipe to delete (con conferma)
- [ ] Swipe-to-delete su card PDF con dialog di conferma

### 9. Rework UI completo (Penpot)
- [ ] Creare prototipo Penpot → approvazione → implementazione

### 10. EAS CI Integration
- [ ] Build automatica su tag release via GitHub Actions

### 11. Bottom tabs navigation
- [ ] Sostituire stack navigator con bottom tabs

### 12. Sync cloud push/pull
- [ ] Sync bidirezionale PDF locale ↔ cloud (Fase 4b)

### 13. Test componenti UI
- [ ] Sbloccato quando @testing-library/react-native sarà compatibile

## Status
[ ] Non iniziato
