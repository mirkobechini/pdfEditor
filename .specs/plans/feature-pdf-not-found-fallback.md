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

- [x] DeleteModal gestisce errore loadPreview - refactored con PdfThumbnail
- [x] SplitDialog gestisce errore loadPreview - error handling added
- [x] RemoveDialog gestisce errore loadPreview - error handling added
- [x] ReorderDialog gestisce errore loadPreview - console.debug added
- [x] Fallback image usato per tutti i casi - placeholder "Preview unavailable"
- [ ] Test aggiunto per scenario error - (prossimo: Issue #137)

## Status

- [ ] Non iniziata
- [ ] In progress
- [ ] In review
- [x] ✅ Completata (merged to dev - PR #135)

## Timeline

Stimato: 2 ore (fix componenti + test)

## Note

- Non modificare pdfPreview.ts (riservato a Issue #137)
- Non modificare API (errore è legittimo da backend)
- Usare Image placeholder da next/image con unoptimized

## Implementazione Dettagli

**Componenti creati/modificati:**
- `frontend/src/app/components/PdfThumbnail.tsx` - Nuovo componente riutilizzabile
- `frontend/src/app/components/DeleteModal.tsx` - Refactored per usare PdfThumbnail
- `frontend/src/app/components/SplitDialog.tsx` - Error handling migliorato
- `frontend/src/app/components/RemoveDialog.tsx` - Error handling migliorato
- `frontend/src/app/components/ReorderDialog.tsx` - console.debug + error state
- `frontend/src/app/page.tsx` - Rimosso duplicate api.deletePdf() call

**Pattern implementato:**
```typescript
async function loadPreview() {
  try {
    const blob = await api.downloadPdf(file.id);
    const dataUrl = await renderFirstPageToDataUrl(url);
    setPreviewUrl(dataUrl);
  } catch (err) {
    console.debug(`Failed to load preview for PDF ${file.id}:`, err);
    setError(true); // mostra placeholder
  }
}
```

**Merged commits:** 8 atomic commits (PR #135)
