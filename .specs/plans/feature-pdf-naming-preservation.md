# Feature Plan: PDF Filename Preservation After Operations

**Status:** Planning  
**Priority:** Medium  
**Complexity:** Low  
**Estimated Time:** 1 day

---

## Objective

Quando l'utente esegue operazioni su PDF (merge, split, reorder, ecc.) e scarica il file modificato, il filename deve essere quello scelto dall'utente, non uno default tipo `merged_...` o `split_...`.

**Current Behavior**:

- User esegue merge → backend restituisce `merged_1234.pdf`
- User esegue split → backend restituisce `split_1234.pdf`

**Desired Behavior**:

- User specifica nome → es. `Invoice_2024_Final.pdf`
- Operazione eseguita
- Download riceve il nome scelto

---

## Implementation

### Backend Changes

#### 1. Add Filename Field to Request

Aggiorna le richieste POST/PUT per operazioni che generano file:

```python
# backend/app/schemas/pdf.py

class MergeRequest(BaseModel):
    pdf_ids: list[str] = Field(..., min_items=2)
    output_filename: str = Field(
        ...,
        min_length=1,
        max_length=255,
        pattern=r"^[^\\/:|?*]+\.pdf$"  # Validate PDF filename
    )

class SplitRequest(BaseModel):
    pdf_id: str
    pages: dict[str, list[int]]  # {"chunk_name": [1,2,3]}
    output_filename: str = Field(..., min_length=1, max_length=255)

class ReorderRequest(BaseModel):
    pdf_id: str
    page_order: list[int]
    output_filename: str = Field(..., min_length=1, max_length=255)
```

#### 2. Update Endpoints to Use Filename

```python
# backend/app/api/v1/merge_split.py

@router.post("/merge", response_model=PDFResponse)
async def merge_pdfs(
    req: MergeRequest,
    current_user: User = Depends(verify_user),
    db: Session = Depends(get_db),
) -> PDFResponse:
    """
    Merge PDFs with custom output filename.
    """
    service = PDFService(db)

    # Validate user owns all PDFs
    for pdf_id in req.pdf_ids:
        pdf = service.get_pdf(pdf_id)
        if pdf.user_id != current_user.id:
            raise HTTPException(status_code=403)

    # Merge and save with specified filename
    merged_pdf = service.merge_pdfs(
        req.pdf_ids,
        output_filename=req.output_filename
    )

    return PDFResponse.model_validate(merged_pdf)
```

#### 3. Update PDFService to Store Filename

```python
# backend/app/services/pdf_service.py

def merge_pdfs(
    self,
    pdf_ids: list[str],
    output_filename: str,
) -> PDFDocument:
    """Merge PDFs and store with custom filename."""
    import fitz

    # Load and merge documents
    merged_doc = fitz.open()
    for pdf_id in pdf_ids:
        doc = fitz.open(self._get_pdf_path(pdf_id))
        merged_doc.insert_pdf(doc)

    # Create new PDF record
    pdf_id = str(uuid4())
    file_path = self._get_pdf_path(pdf_id)

    # Store with custom name (split extension if provided)
    filename = output_filename
    if not filename.endswith(".pdf"):
        filename += ".pdf"

    merged_doc.save(file_path)

    # Save metadata with filename
    pdf = PDFDocument(
        id=pdf_id,
        user_id=self.current_user_id,
        filename=filename,  # Store user-provided filename
        file_size=len(merged_doc.write()),
        pages_count=len(merged_doc),
    )

    self.repo.create(pdf)
    return pdf
```

### Frontend Changes

#### 1. Add Filename Input to Merge Dialog

```tsx
// frontend/src/app/app/merge/MergeDialog.tsx

interface MergeDialogProps {
  selectedPdfs: PDFFile[];
  onMerge: (filenames: string[], outputFilename: string) => void;
  onCancel: () => void;
}

export default function MergeDialog({
  selectedPdfs,
  onMerge,
  onCancel,
}: MergeDialogProps) {
  const t = useTranslations();
  const [outputFilename, setOutputFilename] = useState("merged.pdf");

  const handleMerge = () => {
    if (!outputFilename.trim()) return;
    onMerge(
      selectedPdfs.map((p) => p.id),
      outputFilename,
    );
  };

  return (
    <dialog className="border rounded-lg p-6 space-y-4">
      <h2 className="text-lg font-bold">{t("merge.title")}</h2>

      <div>
        <label className="block text-sm font-medium mb-2">
          {t("merge.selectedFiles")} ({selectedPdfs.length})
        </label>
        <ul className="space-y-1">
          {selectedPdfs.map((pdf) => (
            <li key={pdf.id} className="text-sm text-gray-600">
              • {pdf.filename}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <label
          htmlFor="outputFilename"
          className="block text-sm font-medium mb-2"
        >
          {t("merge.outputFilename")}
        </label>
        <input
          id="outputFilename"
          type="text"
          value={outputFilename}
          onChange={(e) => setOutputFilename(e.target.value)}
          placeholder="merged.pdf"
          className="w-full px-3 py-2 border rounded dark:bg-gray-700"
        />
        <p className="text-xs text-gray-500 mt-1">
          {t("merge.filenameHint")} (.pdf)
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {t("cancel")}
        </button>
        <button
          onClick={handleMerge}
          disabled={!outputFilename.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {t("merge.mergeButton")}
        </button>
      </div>
    </dialog>
  );
}
```

#### 2. Update API Calls

```typescript
// frontend/src/app/lib/api.ts

export const api = {
  pdf: {
    merge: async (pdfIds: string[], outputFilename: string) => {
      const response = await fetch(`${BASE_URL}/merge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`,
        },
        body: JSON.stringify({
          pdf_ids: pdfIds,
          output_filename: outputFilename,
        }),
      });
      return handleResponse(response);
    },

    split: async (
      pdfId: string,
      pages: Record<string, number[]>,
      outputFilename: string,
    ) => {
      const response = await fetch(`${BASE_URL}/split`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`,
        },
        body: JSON.stringify({
          pdf_id: pdfId,
          pages,
          output_filename: outputFilename,
        }),
      });
      return handleResponse(response);
    },
  },
};
```

#### 3. Add Translation Keys

```json
// frontend/messages/en.json
{
  "merge": {
    "title": "Merge PDFs",
    "selectedFiles": "Selected Files",
    "outputFilename": "Output Filename",
    "filenameHint": "Filename without .pdf extension will auto-add it",
    "mergeButton": "Merge"
  },
  "split": {
    "title": "Split PDF",
    "outputFilename": "Output Filename",
    "filenameHint": "Base name for split files (will add _1, _2, etc.)"
  }
}

// frontend/messages/it.json
{
  "merge": {
    "title": "Unisci PDF",
    "selectedFiles": "File Selezionati",
    "outputFilename": "Nome File di Output",
    "filenameHint": "Senza estensione, verrà aggiunto .pdf automaticamente",
    "mergeButton": "Unisci"
  },
  "split": {
    "title": "Dividi PDF",
    "outputFilename": "Nome File di Base",
    "filenameHint": "Nome base per i file divisi (aggiungerà _1, _2, ecc.)"
  }
}
```

---

## Testing

### Backend Tests

```python
# backend/tests/test_pdf_operations.py

def test_merge_with_custom_filename(db, user, pdf1, pdf2):
    """Merge PDFs with custom output filename."""
    response = client.post(
        "/merge",
        json={
            "pdf_ids": [pdf1.id, pdf2.id],
            "output_filename": "Custom_Merged.pdf"
        },
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    merged = response.json()
    assert merged["filename"] == "Custom_Merged.pdf"

def test_invalid_filename_rejected(db, user, pdf1, pdf2):
    """Invalid filenames are rejected."""
    response = client.post(
        "/merge",
        json={
            "pdf_ids": [pdf1.id, pdf2.id],
            "output_filename": "../../etc/passwd"  # Path traversal
        },
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 422  # Validation error
```

### Frontend Tests

```tsx
// frontend/src/app/app/merge/__tests__/MergeDialog.test.tsx

it("allows user to specify output filename", async () => {
  render(
    <MergeDialog
      selectedPdfs={[mockPdf1, mockPdf2]}
      onMerge={mockOnMerge}
      onCancel={() => {}}
    />,
  );

  const input = screen.getByLabelText(/output filename/i);
  fireEvent.change(input, { target: { value: "My_Merged.pdf" } });

  fireEvent.click(screen.getByText(/merge/i));

  expect(mockOnMerge).toHaveBeenCalledWith(
    [mockPdf1.id, mockPdf2.id],
    "My_Merged.pdf",
  );
});
```

---

## Validation & Security

1. **Filename validation regex**: `^[^\\/:|?*]+\.pdf$`
   - Prevents path traversal (`../`, `..\\`)
   - Prevents invalid Windows characters (`:`, `|`, `?`, `*`)
   - Requires `.pdf` extension

2. **Filename length**: Max 255 characters (filesystem limit)

3. **Sanitization**: Strip whitespace, normalize unicode

---

## Implementation Steps

- [ ] Update Pydantic schemas with output_filename field
- [ ] Update backend endpoints (merge, split, reorder)
- [ ] Update PDFService methods
- [ ] Add filename input to frontend dialogs
- [ ] Update API client
- [ ] Add translation keys
- [ ] Test filename validation
- [ ] Test path traversal prevention

---

## Future Enhancements

- [ ] Autocomplete filename based on operation (e.g., "merged_Invoice_2024.pdf")
- [ ] Remember last used filenames
- [ ] Filename templates (e.g., `{operation}_{date}_{user_count}.pdf`)

---

## References

- PDFService: [backend/app/services/pdf_service.py](backend/app/services/pdf_service.py)
- Merge endpoint: [backend/app/api/v1/merge_split.py](backend/app/api/v1/merge_split.py)
