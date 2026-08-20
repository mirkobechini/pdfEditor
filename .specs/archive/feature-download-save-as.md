# Feature: Download / Save As PDF (Desktop)

## Obiettivo

Aggiungere un bottone **Download** (Save As) nell'header dell'editor desktop che permetta di salvare il PDF corrente nella cartella di lavoro (o in una posizione a scelta) tramite dialogo nativo Tauri.

## Dipendenze

- Backend download endpoint già esistente: `GET /pdfs/{id}/download`
- Tauri dialog plugin già installato (`tauri-plugin-dialog`)
- Comando `dialog_open` già esistente in `lib.rs`

## Stack

- Rust (Tauri) per il comando nativo `dialog_save`
- Next.js + React + Tailwind (desktop/frontend)
- FastAPI backend (sidecar)

## Modifiche necessarie

### Rust (Tauri)

1. **`desktop/src-tauri/src/lib.rs`**: Aggiungere comando `dialog_save` che:
   - Apre un dialogo di salvataggio nativo (filter PDF)
   - Pre-compila il nome file
   - Riceve i bytes del PDF e li scrive sul filesystem
   - Restituisce il percorso del file salvato

### Frontend

2. **`desktop/frontend/src/app/app/page.tsx`**: Aggiungere:
   - Bottone "Download" nell'header (accanto a Metadata)
   - Funzione `handleDownload` che scarica il PDF via API e lo salva via `dialog_save`
   - Stato `saving` per feedback visivo

3. **`desktop/frontend/src/shared/tauri.ts`**: Aggiungere tipo per `dialog_save` se necessario

## Output atteso

- Bottone Download nell'header dell'editor
- Click → dialogo nativo di salvataggio (pre-compilato col nome del PDF)
- Dopo salvataggio, feedback "Salvato!" o toast
- Il PDF salvato è nella posizione scelta, decrittato se sbloccato

## Status

[ ] Non iniziata
