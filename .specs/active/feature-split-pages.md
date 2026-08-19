# Feature: Split PDF Dialog (Desktop)

## Obiettivo

Sostituire il bottone mock "SPLIT" nell'editor desktop con un modale funzionante che permetta di dividere un PDF in due parti, scegliendo il punto di split e i nomi di entrambi i file risultanti.

## Dipendenze

- Backend API split già esistente (`POST /pdfs/{id}/split`)
- `PdfMergeSplitService.split_by_ranges` già esistente
- UI pattern da RemovePagesModal e ReorderPagesModal

## Stack

- Frontend: Next.js + React + Tailwind (desktop/frontend)
- Backend: FastAPI + PyMuPDF (fitz)
- API: shared/src/api.ts

## Modifiche necessarie

### Backend

1. **`backend/app/schemas/pdf.py`**: Aggiungere `output_filenames: list[str] | None = None` a `SplitRequest`
2. **`backend/app/services/pdf_merge_split_service.py`**: Aggiornare `split_by_ranges` per accettare `output_filenames` e usarli per nominare i 2 file risultanti

### Shared

3. **`shared/src/api.ts`**: Aggiornare `splitPdf()` per accettare `outputFilenames?: string[]`

### Frontend

4. **`desktop/frontend/src/components/SplitPagesModal.tsx`**: Nuovo componente modale con:
   - Griglia thumbnail (come RemovePages)
   - Clic su una pagina per impostare il punto di split
   - Due campi filename (parte 1 e parte 2)
   - Pulsante Split che chiama `api.splitPdf()` con mode="range" e ranges=["1-N", "N+1-TOTAL"]
5. **`desktop/frontend/src/app/app/page.tsx`**: Wired del modale (header + sidebar Fast Actions)

## Output atteso

- Bottone Split nell'header apre il modale
- Bottone Split nella sidebar Fast Actions apre lo stesso modale
- Split funzionante con nomi personalizzati per ogni parte
- Refresh della lista documenti dopo lo split

## Status

[ ] Non iniziata
