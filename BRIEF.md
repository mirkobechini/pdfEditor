# Brief: PdfEditor

## Obiettivo

Applicazione web per la modifica e gestione di file PDF, con funzionalità di visualizzazione, annotazione e conversione.

## Stack scelto

- Frontend: Inertia.js, TailwindCSS
- Backend: Laravel, PHP, MySQL
- Librerie: DomPDF, TCPDF, FPDI, PHPWord, PhpSpreadsheet
- Viewer PDF: PDF.js (Mozilla) — open source
<<<<<<< HEAD

## Roadmap
1. **Prototipo (Fase 0)** — Singola pagina HTML statica con mockup funzionale (PDF.js per viewer, upload lato client, interfaccia completa). Serve a validare UX e funzionalità prima di scrivere backend.
2. **Versione completa** — Laravel + Inertia.js con backend reale per upload, conversione ed export.
=======
>>>>>>> feature/1-prototype-ui

## Roadmap

1. **Prototipo (Fase 0)** — Singola pagina HTML statica con mockup funzionale (PDF.js per viewer, upload lato client, interfaccia completa). Serve a validare UX e funzionalità prima di scrivere backend.
2. **Versione completa** — Laravel + Inertia.js con backend reale per upload, conversione ed export.

## Componenti principali

- Visualizzazione dei file PDF
- Barra laterale con elenco dei PDF caricati e opzioni di gestione (elimina, rinomina, ecc.)
- barra degli strumenti in alto con opzioni per annotare, modificare e convertire i PDF
- Area di lavoro centrale per visualizzare il PDF selezionato
- Conversione dei PDF in altri formati (Word, Excel, immagini) e viceversa

# Bonus

- Unione e divisione di file PDF
- Modifica del contenuto dei PDF (aggiunta/rimozione di pagine, modifica del testo, modifica ordine delle pagine) (volendo drag and drop)

## Todo list (funzionalità da implementare)

### Fase 1 — UI principale
<<<<<<< HEAD
=======

>>>>>>> feature/1-prototype-ui
- [ ] Barra laterale con elenco PDF caricati (carica, elimina, rinomina)
- [ ] Barra strumenti superiore (annotazione, modifica, conversione)
- [ ] Area di lavoro centrale per visualizzare il PDF selezionato
- [ ] Rendere l'interfaccia responsive (mobile-first)

### Fase 2 — Caricamento e gestione PDF

- [ ] Importazione file PDF (upload)
- [ ] Elenco PDF con nome, dimensione, data
- [ ] Eliminazione file PDF
- [ ] Rinominare file PDF

### Fase 3 — Visualizzazione PDF
<<<<<<< HEAD
=======

>>>>>>> feature/1-prototype-ui
- [ ] Visualizzare il PDF selezionato nell'area di lavoro centrale
- [ ] Navigazione pagine (precedente/successiva/salto a pagina)
- [ ] Zoom avanti/indietro

### Fase 4 — Conversione
<<<<<<< HEAD
=======

>>>>>>> feature/1-prototype-ui
- [ ] Convertire PDF in Word (DOCX)
- [ ] Convertire PDF in Excel (XLSX)
- [ ] Convertire PDF in immagini (PNG/JPG)
- [ ] Convertire da Word/Excel/immagini in PDF

### Fase 5 — Esportazione
<<<<<<< HEAD
=======

>>>>>>> feature/1-prototype-ui
- [ ] Scaricare PDF convertito in altro formato
- [ ] Export in vari formati

### Bonus (post-MVP)
<<<<<<< HEAD
=======

>>>>>>> feature/1-prototype-ui
- [ ] Unione di più file PDF
- [ ] Divisione di un PDF in più file
- [ ] Aggiunta/rimozione pagine
- [ ] Riordino pagine con drag & drop
- [ ] Modifica testo esistente nel PDF
<<<<<<< HEAD



## Vincoli
=======

## Vincoli

>>>>>>> feature/1-prototype-ui
- I file uplodabili devono essere massimo 50MB
- Deve essere responsive e funzionare su dispositivi mobili
- NO autenticazione e gestione utenti
- Deve supportare l'importazione e l'esportazione di file PDF
- Deve essere compatibile con i principali browser web (Chrome, Firefox, Safari, Edge)
- Non utilizzare servizi a pagamento per l'intero progetto, ma solo librerie open source o gratuite.

## Output atteso

- Solo una pagina HTML con la visualizzazione dei file PDF e le funzionalità principali implementate poi attendere un messaggio di conferma da parte dell'utente per una review.
- Nel prototipo non implementare i componenti bonus, ma solo quelli principali.
- Possibilità di visualizzare e modificare i file PDF
- Possibilità di convertire i file PDF in altri formati
- Compatibilità con i principali browser web
- Non deve utilizzare librerie o servizi a pagamento per la gestione dei PDF, ma solo librerie open source o gratuite.

### Sequenza commit prototipo (Fase 0)

La sequenza esatta dei commit è definita in [`AGENT_FLOW.md`](AGENT_FLOW.md) — sezione **Commit granularity — Prototype (Phase 0)**.

L'ordine di implementazione è **per sezione verticale**: sidebar intera (HTML + JS), poi toolbar, poi viewer, poi modali. Ogni commit = una funzionalità atomica (es. upload, rename, delete sono 3 commit separati, non uno solo).
