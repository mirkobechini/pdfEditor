# Feature Plan: Word-like Inline Text Editor for PDF

**Status:** Planning
**Priority:** ALTA (UX Improvement)
**Complexity:** HIGH
**Estimated Time:** 3-5 days

---

## Objective

Sostituire l'attuale dialog **"Find and Replace"** con un editor di testo **inline** dove l'utente può:

1. **Cliccare sul testo nel PDF viewer** → seleziona un blocco di testo
2. **Modificarlo direttamente** → come in Word/Google Docs (click-to-edit)
3. **Salvare le modifiche** → backend applica le modifiche con PyMuPDF

**Non si tratta più di "cerca e sostituisci", ma di editing testuale WYSIWYG direttamente sul PDF renderizzato.**

---

## Current State

**Frontend:** `ReplaceTextDialog.tsx` — input "Search" + input "Replace" + button → API call
**Backend:** `POST /pdfs/{id}/replace-text` — `search + replace + occurrence` → PyMuPDF text search & replace

---

## Challenges

1. **PDF text layer extraction** — PDF.js non espone posizioni editabili. Serve renderizzare un **layer di testo sovrapposto** al canvas del PDF.
2. **Text position mapping** — Ogni blocco di testo ha coordinate (x, y, width, height) nel PDF. Bisogna mappare click utente → blocco testo → backend
3. **PyMuPDF limitations** — PyMuPDF può inserire/modificare testo in posizioni specifiche, ma non in modo "fluido" come un word processor. Ogni modifica è position-based.
4. **Font handling** — Il font originale del PDF potrebbe non essere disponibile. Serve fallback o embedding.
5. **Multi-page editing** — L'utente dovrebbe poter editare su più pagine prima di salvare.

---

## Solution Architecture

### Phase 1 — Text Layer Overlay (Week 1)

#### 1.1 Frontend: Text Layer Extraction

```tsx
// frontend/src/app/components/PdfTextLayer.tsx
// Sovrapposto sopra PdfViewer, mostra testo selezionabile/cliccabile

interface TextBlock {
  pageNum: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontName?: string;
  fontSize?: number;
}
```

Usare **PDF.js text content API** per estrarre i text block:

```typescript
const pdf = await pdfjsLib.getDocument(url).promise;
const page = await pdf.getPage(pageNum);
const textContent = await page.getTextContent();

const blocks: TextBlock[] = textContent.items.map((item: any) => ({
  pageNum,
  x: item.transform[4],
  y: item.transform[5],
  width: item.width,
  height: item.height,
  text: item.str,
  fontName: item.fontName,
  fontSize: item.fontSize,
}));
```

#### 1.2 Frontend: Click-to-Edit Interface

```tsx
// frontend/src/app/components/TextEditorOverlay.tsx
// Mostra un input/textarea sovrapposto al text block cliccato

<div
  style={{
    position: "absolute",
    left: `${block.x * scale}px`,
    top: `${block.y * scale}px`,
    width: `${block.width * scale}px`,
    minHeight: `${block.height * scale}px`,
  }}
>
  <textarea
    value={editingText}
    onChange={setEditingText}
    className="bg-transparent border border-blue-500 outline-none resize"
    style={{ font: `${block.fontSize}px ${block.fontName}` }}
    autoFocus
    onBlur={saveEdit}
    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && saveEdit()}
  />
</div>
```

#### 1.3 Frontend: Toolbar Toggle

Aggiungere un pulsante "Edit Text" nella toolbar che attiva/disattiva la modalità editing:

```tsx
// In Toolbar.tsx
<button
  onClick={() => setTextEditMode(!textEditMode)}
  className={textEditMode ? "bg-blue-500 text-white" : ""}
>
  ✏️ Edit Text
</button>
```

Quando `textEditMode = true`:

- Text layer diventa visibile
- Ogni text block è cliccabile
- Click → textarea sovrapposta per editing
- `Escape` → annulla modifica
- Click fuori → salva modifica

### Phase 2 — Backend Endpoint Update (Week 1)

#### 2.1 New Endpoint: `POST /pdfs/{id}/edit-text`

```python
# backend/app/api/v1/pdfs.py

class EditTextRequest(BaseModel):
    edits: list[TextEdit]  # Batch edits for performance

class TextEdit(BaseModel):
    page_num: int
    x: float
    y: float
    width: float
    height: float
    new_text: str
    font_name: str | None = None
    font_size: float | None = None
```

#### 2.2 Service Layer

```python
# backend/app/services/pdf_service.py

def edit_text(self, pdf_id: str, edits: list[TextEdit]) -> PdfDocument:
    pdf = self.repo.get_by_id(pdf_id)
    file_path = get_file_content(pdf.storage_path)

    doc = fitz.open(stream=file_path, filetype="pdf")

    for edit in edits:
        page = doc[edit.page_num - 1]

        # Redact the old text area (white rectangle)
        redact_rect = fitz.Rect(
            edit.x, edit.y,
            edit.x + edit.width, edit.y + edit.height
        )
        page.add_redact_annot(redact_rect, fill=(1, 1, 1))
        page.apply_redactions()

        # Insert new text at same position
        # Use the original font if available, else fallback
        font = fitz.Font(edit.font_name or "helv")
        page.insert_text(
            point=fitz.Point(edit.x, edit.y + edit.height - 2),  # baseline adjustment
            text=edit.new_text,
            fontname=edit.font_name or "helv",
            fontsize=edit.font_size or 11,
            font=font,
        )

    # Save modified PDF
    modified_bytes = doc.write()
    doc.close()

    # Store and return
    new_pdf = self.repo.create(...)
    save_pdf(new_pdf.storage_path, modified_bytes)
    return new_pdf
```

### Phase 3 — Save Flow (Week 2)

L'utente modifica testo su più pagine, poi clicca "Save" nella toolbar:

```tsx
const [pendingEdits, setPendingEdits] = React.useState<TextEdit[]>([]);
const [saving, setSaving] = React.useState(false);

async function handleSaveEdits() {
  if (!selectedId || pendingEdits.length === 0) return;
  setSaving(true);
  try {
    const updated = await api.editText(selectedId, pendingEdits);
    setPendingEdits([]);
    setTextEditMode(false);
    setSidebarRefreshKey((prev) => prev + 1);
    // Reload PDF viewer with modified PDF
    const blob = await api.downloadPdf(updated.id);
    const url = URL.createObjectURL(blob);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl(url);
  } catch (err) {
    console.error("Save edits failed:", err);
  } finally {
    setSaving(false);
  }
}
```

---

## UI Mockup

```
┌─────────────────────────────────────────────────┐
│ Toolbar: [✏️ Edit Text] [💾 Save Edits (3)] ... │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │ [Page 1]                                │    │
│  │ Lorem ipsum dolor sit amet,             │    │
│  │ consectetur adipiscing elit,            │    │
│  │ sed do [eiusmod tempor incididunt] ← cliccato,  │
│  │         ┌──────────────────┐            │    │
│  │         │ eiusmod tempor   │ ← textarea │    │
│  │         │ incididunt       │            │    │
│  │         └──────────────────┘            │    │
│  │ ut labore et dolore magna aliqua.       │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │ [Page 2]                                │    │
│  │ ...                                      │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

---

## Dependencies

**New npm packages (frontend):**

- None — tutto basato su PDF.js (già presente)

**New Python packages (backend):**

- Nessuno — tutto via PyMuPDF (già presente)

**Existing resources:**

- PDF.js `textContent` API (già caricato in SplitDialog/ReorderDialog)
- PyMuPDF `insert_text()` e `add_redact_annot()` (già presenti)

---

## Files to Modify

**Frontend (NEW):**

- `frontend/src/app/components/PdfTextLayer.tsx` — Text layer overlay component
- `frontend/src/app/components/TextEditorOverlay.tsx` — Click-to-edit overlay

**Frontend (MODIFY):**

- `frontend/src/app/components/PdfViewer.tsx` — Integrate text layer when edit mode active
- `frontend/src/app/components/Toolbar.tsx` — Add "Edit Text" toggle and "Save Edits" button
- `frontend/src/app/lib/api.ts` — Add `editText()` method
- `frontend/src/app/app/page.tsx` — Integrate text editor state

**Backend (MODIFY):**

- `backend/app/api/v1/pdfs.py` — Add `PUT /pdfs/{id}/edit-text` endpoint
- `backend/app/services/pdf_service.py` — Add `edit_text()` method
- `backend/app/schemas/pdf.py` — Add `EditTextRequest` and `TextEdit` schemas

**Tests (NEW):**

- `frontend/src/app/components/__tests__/PdfTextLayer.test.tsx`
- `backend/tests/test_edit_text.py`

---

## Acceptance Criteria

- [ ] User can click text in PDF viewer to select a block
- [ ] Selected text shows editable textarea at the same position
- [ ] Multiple text blocks can be edited before saving
- [ ] "Save Edits" button saves all pending edits
- [ ] Saved PDF reflects all text changes
- [ ] Undo/redo works after text edit
- [ ] Works on multi-page PDFs
- [ ] Works in merge/split/reorder output PDFs
- [ ] All tests pass

---

## Limitations & Known Issues

1. **Font substitution** — Se il font originale non è disponibile, PyMuPDF usa Helvetica. Il layout potrebbe cambiare leggermente.
2. **Right-to-left text** — Non supportato in prima iterazione
3. **Complex layouts** — Testo in colonne, tabelle, o percorsi curvi potrebbe non essere editabile
4. **Image-based text** — Testo embedded in immagini non rilevabile da PDF.js textContent
5. **Character encoding** — PDF.js textContent può avere caratteri spezzati/riordinati

---

## Future Enhancements (Phase 2)

- Rich text toolbar (bold, italic, font size picker)
- Right-to-left support
- Text color picker
- Multi-select text blocks
- Undo/redo within text editing session
- Copy/paste from external sources

---

## Definition of Done

- [ ] Text layer rendering over PDF viewer
- [ ] Click-to-edit interface working (single block)
- [ ] Batch multi-block editing
- [ ] Save flow → API → backend → PDF updated
- [ ] Sidebar refresh after save
- [ ] All tests pass (backend + frontend)
- [ ] PR reviewed and merged
- [ ] ADR and this plan updated with completion status
