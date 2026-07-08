---
name: pdf-editor
description: "PDF editing skill for any project using PyMuPDF (fitz) on the backend for all PDF manipulation (merge/split/reorder/remove-pages, find&replace and text extraction, read/write metadata, password unlock, export to TXT/PNG/JPG/SVG, import from TXT/images, undo/redo via snapshots). PDF.js 3.11.174 from CDN on the frontend for page rendering on canvas with devicePixelRatio scaling and data URL thumbnails. Banned: pypdf, pdfplumber, reportlab, pikepdf, pdf-lib. Architecture: Service → Repository → DB (SQLAlchemy) + UUID filesystem storage. FastAPI endpoints under /pdfs/* protected by JWT."
---

# PDF Editing — PyMuPDF + PDF.js Skill

This project uses a **fixed** stack for PDF manipulation. Always follow these guidelines.

---

## 📁 Skill Assets

Questa skill include script, reference e template richiamabili al bisogno:

### Scripts (`./scripts/`)

| Script                                     | Descrizione                                   | Uso                                |
| ------------------------------------------ | --------------------------------------------- | ---------------------------------- |
| [start-stack.sh](./scripts/start-stack.sh) | Avvia backend (uvicorn) + frontend (next dev) | `./scripts/start-stack.sh`         |
| [run-tests.sh](./scripts/run-tests.sh)     | Esegue i test del backend con pytest          | `./scripts/run-tests.sh [opzioni]` |
| [reset-db.sh](./scripts/reset-db.sh)       | Cancella DB, storage e ricrea da zero         | `./scripts/reset-db.sh`            |
| [seed-data.sh](./scripts/seed-data.sh)     | Crea utenti di esempio (demo/pro/admin)       | `./scripts/seed-data.sh`           |

### References (`./references/`)

| File                                                          | Contenuto                                    |
| ------------------------------------------------------------- | -------------------------------------------- |
| [api-endpoints.md](./references/api-endpoints.md)             | Tutti gli endpoint FastAPI con metodi e path |
| [frontend-components.md](./references/frontend-components.md) | Struttura componenti React e dipendenze      |
| [tauri-setup.md](./references/tauri-setup.md)                 | Guida per la build Tauri (Fase 1c)           |

### Assets (`./assets/`)

| File                                                            | Contenuto                           |
| --------------------------------------------------------------- | ----------------------------------- |
| [issue-feature-template.md](./assets/issue-feature-template.md) | Template per issue di nuove feature |
| [pr-template.md](./assets/pr-template.md)                       | Template per pull request           |

---

## Backend — PyMuPDF (fitz)

### ✅ Golden rules

- **Always** `import fitz` (never pypdf, pdfplumber, reportlab, pikepdf)
- **Always** open from bytes: `fitz.open(stream=content, filetype="pdf")`
- **Always** close with `doc.close()` (use `try/finally`)
- **Always** serialize with `doc.tobytes()` (never save directly to disk)
- **Passwords**: `doc.needs_pass` to detect, `doc.authenticate(pwd)` to unlock (returns 0 on failure)

### Core operations

#### Open and read properties

```python
import fitz

doc = fitz.open(stream=content, filetype="pdf")
page_count = doc.page_count
is_encrypted = bool(doc.needs_pass)
meta = doc.metadata  # dict: title, author, subject, keywords
doc.close()
```

#### Extract text

```python
doc = fitz.open(stream=content, filetype="pdf")
try:
    text = doc[page_num].get_text()  # single page (0-based)
finally:
    doc.close()
```

#### Find and replace text

```python
doc = fitz.open(stream=content, filetype="pdf")
try:
    for page_num in range(doc.page_count):
        page = doc[page_num]
        rects = page.search_for(search_text)
        for rect in rects:
            page.add_redact_annot(rect, fill=None)  # remove old text
            page.apply_redactions()
            page.insert_text(
                (rect.x0, rect.y0 + 1),
                replace_text,
                fontname="helv",
                fontsize=11,
            )
    out_bytes = doc.tobytes()
finally:
    doc.close()
```

#### Merge multiple PDFs

```python
output = fitz.open()
for doc in source_docs:  # list of fitz.Document
    output.insert_pdf(doc)
out_bytes = output.tobytes()
output.close()
```

#### Split by pages or ranges

```python
source = fitz.open(stream=content, filetype="pdf")
try:
    output = fitz.open()
    output.insert_pdf(source, from_page=start, to_page=end)  # 0-based, inclusive
    out_bytes = output.tobytes()
    output.close()
finally:
    source.close()
```

#### Reorder pages

```python
source = fitz.open(stream=content, filetype="pdf")
source.select(zero_based_page_list)  # e.g. [2, 0, 1] to reverse first 3 pages
out_bytes = source.tobytes()
source.close()
```

#### Remove pages

```python
source = fitz.open(stream=content, filetype="pdf")
# Build a list of all pages except those to remove
keep = [i for i in range(source.page_count) if i not in set(to_remove)]
source.select(keep)  # select() also works as delete
out_bytes = source.tobytes()
source.close()
```

#### Read / Write metadata

```python
source = fitz.open(stream=content, filetype="pdf")
meta = dict(source.metadata)       # read
meta["title"] = "New Title"
source.set_metadata(meta)          # write
out_bytes = source.tobytes()
source.close()
```

#### Export (PDF → TXT/PNG/JPG/SVG)

Export returns a **3-tuple**: `(content: bytes, media_type: str, filename: str)`. Example implementation:

```python
def export_pdf(self, pdf_id: str, user_id: str, fmt: str) -> tuple[bytes, str, str]:
    source = fitz.open(stream=content, filetype="pdf")

    if fmt == "txt":
        text_parts = [page.get_text() for page in source]
        result = "\n---\n".join(text_parts).encode("utf-8")
        media_type = "text/plain"
        filename = f"{base_name}.txt"

    elif fmt in ("png", "jpg", "jpeg"):
        ext = "jpeg" if fmt in ("jpg", "jpeg") else "png"
        pix = source[0].get_pixmap(dpi=150)
        result = pix.tobytes(ext)
        media_type = f"image/{ext}"
        filename = f"{base_name}.{ext}"

    elif fmt == "svg":
        svg = source[0].get_svg_image()
        result = svg.encode("utf-8")
        media_type = "image/svg+xml"
        filename = f"{base_name}.svg"

    source.close()
    return result, media_type, filename
```

#### Import (TXT/PNG/JPG/GIF/BMP → PDF)

```python
if ext == "txt":
    doc = fitz.open()
    page_idx = doc.insert_page(-1, width=612, height=792)
    doc[page_idx].insert_text((50, 100), text_content, fontname="helv", fontsize=11)
    pdf_bytes = doc.tobytes()
    doc.close()
elif ext in ("png", "jpg", "jpeg", "gif", "bmp"):
    doc = fitz.open(stream=content, filetype=ext)  # opens image directly
    pdf_bytes = doc.tobytes()
    doc.close()
```

#### Unlock password-protected PDF

```python
doc = fitz.open(stream=content, filetype="pdf")
if doc.needs_pass:
    auth = doc.authenticate(password)  # 0 = failed, >0 = success
    if auth == 0:
        raise ValueError("Incorrect password")
    # Once authenticated, use tobytes() to get decrypted content
doc.close()
```

### Backend architecture pattern

```
Service → Repository → DB (SQLAlchemy)
       → Storage (UUID filesystem)
```

- **Service layer** — business logic, uses `import fitz`
- **Repository layer** — `create(pdf)`, `get_by_id_and_user(id, user_id)`, `delete(pdf)` etc.
- `save_pdf(content: bytes) → str` (returns UUID)
- `get_pdf_path(uuid: str) → Path | None`
- `validate_pdf(content: bytes) → bool` — checks `%PDF` magic bytes + opens with fitz
- Storage filename: `"{uuid}.pdf"`

### PDF response schema example (Pydantic)

```python
class PdfResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    original_filename: str
    file_size: int
    page_count: int
    title: str | None = None
    author: str | None = None
    is_password_protected: bool = False
    created_at: datetime
    updated_at: datetime
```

Use `Model.model_validate(orm_obj)` to serialize from a SQLAlchemy model.

### Undo/Redo (snapshots)

- Snapshots saved to disk BEFORE each modification
- Configurable limit (e.g. max 10 snapshots per PDF)
- Separate stacks: undo saves current state to `{pdf_id}_redo` before restoring
- `save_snapshot(pdf_id, content)`, `get_latest_snapshot(pdf_id)`, `pop_latest_snapshot(pdf_id)`

---

## Frontend — PDF.js

### ✅ Golden rules

- **Always** load PDF.js 3.11.174 from CDN with a dynamic `<script>` tag
- **Always** set `pdfjsLib.GlobalWorkerOptions.workerSrc`
- **Always** load the worker from the same version and CDN
- **Always** scale the canvas with `devicePixelRatio` for Retina/HiDPI displays
- Use `URL.createObjectURL(blob)` to create URLs from downloaded blobs

### Load PDF.js

```typescript
// Inside a React component, mount effect
React.useEffect(() => {
  if ((window as any).pdfjsLib) {
    (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    setPdfJsLoaded(true);
    return;
  }

  const script = document.createElement("script");
  script.src =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  script.async = true;
  script.onload = () => {
    (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    setPdfJsLoaded(true);
  };
  document.body.appendChild(script);
  return () => {
    document.body.removeChild(script);
  };
}, []);
```

### Render a page on canvas

```typescript
const pdfjsLib = (window as any).pdfjsLib;
const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
const page = await pdf.getPage(pageNumber); // 1-based

const viewport = page.getViewport({ scale: zoom });
const canvas = document.createElement("canvas");
const dpr = window.devicePixelRatio || 1;

canvas.width = viewport.width * dpr;
canvas.height = viewport.height * dpr;
canvas.style.width = `${viewport.width}px`;
canvas.style.height = `${viewport.height}px`;

const ctx = canvas.getContext("2d")!;
ctx.scale(dpr, dpr);

await page.render({ canvasContext: ctx, viewport }).promise;
```

### Generate thumbnail (first page → data URL)

Pattern: render the first page of a PDF to a data URL thumbnail.

```typescript
export async function renderFirstPageToDataUrl(
  pdfUrl: string,
): Promise<string> {
  // Load PDF.js if not already loaded
  // pdfjsLib.getDocument(pdfUrl).promise → pdf.getPage(1)
  // Render with viewport scale ~0.5 for thumbnails
  // canvas.toDataURL("image/png") — returns data URL
}
```

### Load thumbnails for all pages

Pattern: download a PDF blob, then render each page as a thumbnail on canvas.

```typescript
const blob = await api.downloadPdf(selectedId);
const url = URL.createObjectURL(blob);
const pdf = await pdfjsLib.getDocument(url).promise;

for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  // render on canvas (adjust scale as needed, e.g. 0.3 for thumbnails)
  results.push({ pageNum: i, dataUrl: canvas.toDataURL("image/png") });
}

URL.revokeObjectURL(url); // cleanup
```

### API Client (frontend)

```typescript
class ApiClient {
  private baseUrl: string = "http://localhost:8000";
  private token: string | null = null;

  // Auth
  setToken(token: string | null);
  private getHeaders(): Record<string, string>; // adds Authorization Bearer

  // PDF operations
  async uploadPdf(file: File): Promise<PdfDocument>;
  async listPdfs(): Promise<PdfListResponse>;
  async downloadPdf(id: string): Promise<Blob>;
  async deletePdf(id: string): Promise<void>;
  async mergePdfs(pdfIds: string[]): Promise<PdfDocument>;
  async splitPdf(
    id: string,
    mode: string,
    ranges?: string[],
  ): Promise<SplitResponse>;
  async reorderPdf(id: string, pageOrder: number[]): Promise<PdfDocument>;
  async removePages(id: string, pageNumbers: number[]): Promise<PdfDocument>;
  async replaceText(
    id: string,
    search: string,
    replace: string,
    occurrence?: number,
  ): Promise<PdfDocument>;
  async extractText(id: string, page?: number): Promise<TextResponse>;
  async getMetadata(id: string): Promise<Metadata>;
  async updateMetadata(
    id: string,
    metadata: Partial<Metadata>,
  ): Promise<PdfDocument>;
  async exportPdf(id: string, format: string): Promise<Blob>;
  async importFile(file: File): Promise<PdfDocument>;
  async unlockPdf(id: string, password: string): Promise<PdfDocument>;
  async undoPdf(id: string): Promise<PdfDocument>;
  async redoPdf(id: string): Promise<PdfDocument>;
}
```

---

## API Endpoints (FastAPI)

All endpoints are on a router with `prefix="/pdfs"` and protected by JWT.

| Endpoint                  | Method | Description             |
| ------------------------- | ------ | ----------------------- |
| `/pdfs`                   | GET    | List user's PDFs        |
| `/pdfs/upload`            | POST   | Upload a new PDF        |
| `/pdfs/{id}`              | GET    | Get PDF metadata        |
| `/pdfs/{id}`              | DELETE | Delete a PDF            |
| `/pdfs/{id}/download`     | GET    | Download PDF file       |
| `/pdfs/merge`             | POST   | Merge multiple PDFs     |
| `/pdfs/{id}/split`        | POST   | Split a PDF             |
| `/pdfs/{id}/reorder`      | POST   | Reorder pages           |
| `/pdfs/{id}/remove-pages` | POST   | Remove pages            |
| `/pdfs/{id}/replace-text` | POST   | Find & replace text     |
| `/pdfs/{id}/text`         | GET    | Extract text            |
| `/pdfs/{id}/metadata`     | GET    | Read metadata           |
| `/pdfs/{id}/metadata`     | PUT    | Update metadata         |
| `/pdfs/{id}/export`       | POST   | Export to other format  |
| `/pdfs/import`            | POST   | Import file → PDF       |
| `/pdfs/{id}/unlock`       | POST   | Unlock protected PDF    |
| `/pdfs/{id}/undo`         | POST   | Undo last modification  |
| `/pdfs/{id}/redo`         | POST   | Redo last undone change |

### Typical endpoint pattern

```python
@router.post("/{pdf_id}/operation", response_model=ResponseSchema)
def operation_name(
    pdf_id: str,
    req: RequestSchema,
    current_user: User = Depends(get_current_user),  # auth required
    service: YourService = Depends(get_your_service),
) -> ResponseSchema:
    try:
        result = service.method_name(pdf_id, current_user.id, ...)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return ResponseSchema.model_validate(result)
```

---

## Anti-patterns (DO NOT do)

- ❌ Use `pypdf`, `pdfplumber`, `reportlab` — always use PyMuPDF
- ❌ Open PDF from a file path — always use `fitz.open(stream=bytes, filetype="pdf")`
- ❌ Forget `doc.close()` — causes memory leaks
- ❌ Use `pdf-lib` on the client for backend operations — always use the API
- ❌ Load PDF.js with duplicate `<script>` tags in multiple modules — load once
- ❌ Omit `devicePixelRatio` scaling on PDF.js canvases — thumbnails will be blurry on Retina
- ❌ Use `get_document()` with a filename instead of a URL — `pdfjsLib.getDocument()` accepts URL strings or Uint8Array
