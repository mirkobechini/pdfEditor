# Feature: Mobile app migliorie post-MVP (issue 618)

## Obiettivo
Migliorie UX e funzionalità mancanti dopo il completamento del MVP mobile.

## Task pianificate (in ordine di esecuzione)

### 1. Metadata editing
- [ ] Aggiungere dialog in ToolsScreen per modificare titolo e autore del PDF
- [ ] Usare `updateMetadata` già presente in pdfService.ts

### 2. Password protect/unlock PDF
- [ ] Aggiungere dialog per impostare/rimuovere password su PDF
- [ ] Usare `pdf-lib` (PDFDocument.encrypt/decrypt)

### 3. Hook useSyncQueue (background)
- [ ] Creare hook per coda di operazioni da sincronizzare col cloud
- [ ] Eseguire sync in background quando c'è connessione
- [ ] Struttura già predisposta in localDb

### 4. Refresh-to-reload in Home
- [ ] Aggiungere pull-to-refresh in HomeScreen per ricaricare lista PDF

### 5. Search/filter in Home
- [ ] Aggiungere barra di ricerca sopra la lista PDF in Home
- [ ] Filtrare per nome file

### 6. Preview thumbnail in Home
- [ ] Estrarre prima pagina del PDF con pdf-lib e mostrare thumbnail
- [ ] Usare `getPage(0).toDataUrl()` o simile

### 7. Toast/notifiche dopo operazioni
- [ ] Sostituire i testi "result" in ToolsScreen con toast temporanei
- [ ] Usare `Snackbar` di React Native Paper

### 8. Swipe to delete (con conferma)
- [ ] Aggiungere swipe-to-delete su ogni card PDF in Home
- [ ] Mostrare dialog di conferma prima di eliminare

## Dipendenze
- Task 1 e 2 sono indipendenti e possono essere fatti subito
- Task 3 ha struttura già predisposta

## Status
[ ] Non iniziato
