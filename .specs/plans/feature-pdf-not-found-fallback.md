# Feature: PDF Not Found Fallback (Thumbnail Load Error)

**Issue Number**: issue-136

## Obiettivo

Gestire gracefully l'errore "PDF not found" quando si tenta di caricare le anteprime PDF nelle dialog (DeleteModal, SplitDialog, RemoveDialog, ReorderDialog). Implementare fallback UI con placeholder e messaggio d'errore silenzioso in console.

## Problema

Quando un PDF viene eliminato mentre un'altra scheda/utente sta caricando l'anteprima, `api.downloadPdf(file.id)` restituisce 404. Causa:

- Race condition tra eliminazione PDF e rendering thumbnail
- L'endpoint `/pdfs/{id}/download` non trova il file

## Dipendenze

- Componenti: DeleteModal, SplitDialog, RemoveDialog, ReorderDialog
- Libreria: pdfPreview.ts (renderFirstPageToDataUrl)
- API client: api.downloadPdf()

## Stack

- Frontend: React 19 + TypeScript
- Testing: vitest + @testing-library/react

## Output atteso

✅ Quando il caricamento preview fallisce:

1. Non lancia exception, ma gestisce silenziosamente
2. Mostra placeholder image (grigio) con fallback icon
3. Log dell'errore solo in console (non in UI)
4. Dialog rimane funzionale (utente può comunque procedere senza preview)
5. Tutti i test di error handling passano

## Accettazione Criteria

- [ ] DeleteModal gestisce errore loadPreview
- [ ] SplitDialog gestisce errore loadPreview
- [ ] RemoveDialog gestisce errore loadPreview
- [ ] ReorderDialog gestisce errore loadPreview
- [ ] Fallback image usato per tutti i casi
- [ ] Test aggiunto per scenario error

## Status

- [ ] Non iniziata
- [ ] In progress
- [ ] In review
- [ ] Completata

## Timeline

Stimato: 2 ore (fix componenti + test)

## Note

- Non modificare pdfPreview.ts (riservato a Issue #137)
- Non modificare API (errore è legittimo da backend)
- Usare Image placeholder da next/image con unoptimized
