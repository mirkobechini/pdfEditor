# Bug Fix Plan: PDF Not Appearing in Sidebar After Save

**Status:** Planning  
**Priority:** ALTA (UX Issue)  
**Severity:** High (Data appears to be lost)  
**Complexity:** Medium  
**Estimated Time:** 2-3 hours

---

## Problem Statement

Dopo che l'utente modifica e salva un PDF (merge, split, reorder, ecc.), il file non appare automaticamente nella sidebar fino a quando non ricarica manualmente la pagina (`F5` o refresh).

**Osservato in:**

- POST `/pdfs/{id}/merge` → PDF merged non appare
- POST `/pdfs/{id}/split` → PDF split non appare
- POST `/pdfs/{id}/reorder` → PDF riordinato non appare

**Workaround attuale:** L'utente deve ricaricare la pagina manualmente.

**Impatto:**

- Confusione: utente pensa il salvataggio sia fallito
- UX degradata: operazioni multifile diventano noiose (refresh continui)
- Potenziale data loss perception (il PDF c'è, ma non visibile)

---

## Root Cause Analysis

Probabili cause (da verificare):

1. **Sidebar non aggiorna la lista dopo operazione API** — Il `refreshKey` o state di refresh non viene triggerato
   - Locate: `frontend/src/app/components/Sidebar.tsx`
   - Sintomo: Lista PDFs rimane statica dopo POST

2. **Cache API non invalidata** — Risposta della GET `/pdfs` non viene rifetchata
   - Locate: `frontend/src/app/lib/api.ts` (manca `cache-control: no-cache`?)
   - Sintomo: Browser cache serves stale PDF list

3. **ID del nuovo PDF diverso da quello atteso** — Operazione crea nuovo PDF ma frontend cerca il vecchio
   - Locate: API response handling in operazione (merge/split)
   - Sintomo: Nuovo PDF esiste nel server, ma SID mismatch

4. **Missing refetch trigger in dialog component** — ModalDialog (MergeDialog, SplitDialog, ecc.) non triggera Sidebar update
   - Locate: `frontend/src/app/components/pdf/MergeDialog.tsx`, `SplitDialog.tsx`, ecc.
   - Sintomo: Modal si chiude ma Sidebar rimane statica

5. **useEffect dependency issue** — useEffect per fetch PDFs non dipende da refresh trigger
   - Locate: Sidebar useEffect
   - Sintomo: Dipendenza incompleta

---

## Solution Approach

### Frontend

#### 1. Verificare Sidebar refresh mechanism

```tsx
// frontend/src/app/components/Sidebar.tsx
const [refreshKey, setRefreshKey] = React.useState(0);

// Trigger refresh quando necessario
const handleRefresh = () => setRefreshKey((k) => k + 1);

useEffect(() => {
  fetchPdfs();
}, [refreshKey]); // Dipendenza su refreshKey
```

#### 2. Propagate refresh da dialog a Sidebar

Passare callback `onOperationSuccess` dai dialog al parent:

```tsx
// In page.tsx (app root)
const [refreshKey, setRefreshKey] = React.useState(0);
const handleOperationSuccess = () => setRefreshKey(k => k + 1);

// Pass to Sidebar
<Sidebar refreshKey={refreshKey} />

// Pass to dialogs
<MergeDialog onSuccess={handleOperationSuccess} />
<SplitDialog onSuccess={handleOperationSuccess} />
```

#### 3. Add cache-busting headers

```typescript
// frontend/src/app/lib/api.ts
export const api = {
  get: async (path: string) => {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
    return handleResponse(response);
  },
};
```

#### 4. Verify API response contains new PDF ID

Assicurarsi che POST `/pdfs/{id}/merge` (e similari) ritornino:

```json
{
  "id": "new-pdf-uuid",
  "filename": "merged.pdf",
  "page_count": 10,
  "is_password_protected": false,
  "created_at": "2026-07-10T10:00:00Z"
}
```

Se ritorna solo status 200, non è possibile auto-update sidebar.

### Backend

#### 1. Verify POST responses return new PDF object

```python
# backend/app/api/v1/pdfs.py
@router.post("/{pdf_id}/merge", response_model=PdfResponse)
def merge_pdfs(
    pdf_id: str,
    merge_list: MergeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Merge PDFs and return the new PDF."""
    service = PdfService(db)

    # ... merge logic ...

    new_pdf = service.create(merged_bytes, ...)
    return PdfResponse.model_validate(new_pdf)  # ← Return new PDF
```

---

## Test Plan

### Frontend Unit Tests

```typescript
// frontend/src/app/components/Sidebar.test.tsx
test("should refetch PDFs when refreshKey changes", async () => {
  const { rerender } = render(<Sidebar refreshKey={0} />);
  await waitFor(() => expect(fetchPdfs).toHaveBeenCalledTimes(1));

  rerender(<Sidebar refreshKey={1} />);
  await waitFor(() => expect(fetchPdfs).toHaveBeenCalledTimes(2));
});
```

### Integration Tests

```typescript
// frontend/src/app/app/__tests__/pdf-operations.test.tsx
test("should update sidebar after merge operation", async () => {
  // 1. Upload PDF 1 and 2
  // 2. Click merge button
  // 3. Verify new PDF appears in sidebar immediately
  // 4. Assert sidebar.pdfList includes new merged PDF
});
```

### Manual Test Steps

1. Upload PDF (appears in sidebar ✓)
2. Merge with another PDF
3. Observe: new merged PDF should appear immediately
4. Do NOT refresh page — verify it's there
5. Repeat for split, reorder operations

---

## Acceptance Criteria

- [ ] After merge/split/reorder, new PDF appears in sidebar immediately
- [ ] No manual page refresh required
- [ ] Backend returns full PDF object in POST response
- [ ] Frontend triggers Sidebar refetch on operation success
- [ ] All merge/split/reorder operations pass new integration tests

---

## Files to Modify

**Backend:**

- `backend/app/api/v1/pdfs.py` — Verify POST endpoints return PdfResponse

**Frontend:**

- `frontend/src/app/components/Sidebar.tsx` — Add refresh mechanism
- `frontend/src/app/app/page.tsx` — Manage refreshKey state
- `frontend/src/app/components/pdf/MergeDialog.tsx` — Trigger onSuccess callback
- `frontend/src/app/components/pdf/SplitDialog.tsx` — Trigger onSuccess callback
- `frontend/src/app/components/pdf/ReorderDialog.tsx` — Trigger onSuccess callback
- `frontend/src/app/lib/api.ts` — Add cache-busting headers

**Tests:**

- `frontend/src/app/components/Sidebar.test.tsx` — Test refresh mechanism
- `frontend/src/app/app/__tests__/pdf-operations.test.tsx` — Integration test

---

## Definition of Done

- ✅ All files modified
- ✅ No `console.error` or `console.warn`
- ✅ Tests pass: `npm run test` (frontend) + `pytest` (backend)
- ✅ Manual test: merge/split/reorder operations update sidebar without page refresh
- ✅ PR reviewed and merged to `dev`
- ✅ ADR.md and this plan updated with completion status
