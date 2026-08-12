# Feature Plan: PDF Compression

**Status:** Planning  
**Priority:** Low  
**Complexity:** Medium  
**Estimated Time:** 1-2 days

---

## Objective

Permettere agli utenti di comprimere PDF riducendo la dimensione file mantenendo una qualità visiva accettabile. Utile per email, cloud storage, ecc.

**Compression strategies**:

1. Ridurre qualità immagini (JPEG compression level)
2. Rimuovere stream duplicati
3. Remove embedded fonts (se non essenziali)
4. Comprimere font subset

---

## PyMuPDF (fitz) Compression

PyMuPDF supporta compressione via `Document.save()` con parametri:

```python
# Default save (no compression)
doc.save("output.pdf")

# Compressed save
doc.save("output.pdf", deflate=True)

# Advanced options (v1.24+)
doc.save(
    "output.pdf",
    deflate=True,           # Enable zlib compression
    garbage=4,              # Garbage collection level (0-4)
    clean=True,             # Remove unreachable objects
    preserve_metadata=True, # Keep creation date, author, etc.
)
```

---

## Implementation

### Backend Endpoint: `POST /compress`

```python
# backend/app/api/v1/pdf.py

@router.post("/compress", response_model=PDFResponse)
async def compress_pdf(
    req: CompressRequest,
    current_user: User = Depends(verify_user),
    db: Session = Depends(get_db),
) -> PDFResponse:
    """
    Compress PDF with specified quality level.

    Quality levels:
    - 1: High compression, lower quality
    - 2: Medium compression, medium quality (default)
    - 3: Low compression, high quality
    """
    service = PDFService(db)

    # Get original PDF
    pdf = service.get_pdf(req.pdf_id)
    if pdf.user_id != current_user.id:
        raise HTTPException(status_code=403)

    # Compress
    compressed_pdf = service.compress_pdf(
        req.pdf_id,
        quality_level=req.quality_level,
        output_filename=req.output_filename or f"{pdf.filename[:-4]}_compressed.pdf"
    )

    return PDFResponse.model_validate(compressed_pdf)
```

### Schema

```python
# backend/app/schemas/pdf.py

class CompressRequest(BaseModel):
    pdf_id: str
    quality_level: int = Field(default=2, ge=1, le=3)  # 1=high, 2=medium, 3=low
    output_filename: str | None = Field(None, max_length=255)

class CompressionStats(BaseModel):
    original_size: int  # bytes
    compressed_size: int  # bytes
    reduction_percent: float  # e.g., 45.3
    estimated_time_ms: int
```

### PDFService Method

```python
# backend/app/services/pdf_service.py

def compress_pdf(
    self,
    pdf_id: str,
    quality_level: int = 2,
    output_filename: str | None = None,
) -> PDFDocument:
    """
    Compress PDF with specified quality level.

    Quality levels:
    - 1: High compression (reduce image quality to 60%)
    - 2: Medium compression (reduce to 75%)
    - 3: Low compression (reduce to 90%, mostly just stream compression)
    """
    import fitz
    import time
    from pathlib import Path

    start_time = time.time()

    # Load original PDF
    original_path = self._get_pdf_path(pdf_id)
    doc = fitz.open(original_path)

    # Get original size
    original_size = Path(original_path).stat().st_size

    # Compression parameters based on quality level
    quality_map = {
        1: {"image_quality": 60, "garbage": 4},
        2: {"image_quality": 75, "garbage": 3},
        3: {"image_quality": 90, "garbage": 2},
    }

    params = quality_map.get(quality_level, quality_map[2])

    # Compress images if quality < 3
    if quality_level < 3:
        for page in doc:
            images = page.get_images()
            for img_index in images:
                xref = img_index[0]
                pix = fitz.Pixmap(doc, xref)

                # Reduce image quality
                if pix.n - pix.alpha < 4:  # RGB or gray
                    # Resample and re-compress
                    temp = pix.shrink(1)  # Optional: reduce resolution
                    new_pix = fitz.Pixmap(temp, fitz.csRGB)

                    doc.replace_image(
                        xref,
                        stream=new_pix.tobytes("jpeg")
                    )

    # Save compressed version
    new_pdf_id = str(uuid4())
    new_path = self._get_pdf_path(new_pdf_id)

    doc.save(
        new_path,
        deflate=True,
        garbage=params["garbage"],
        clean=True,
    )

    # Get compressed size
    compressed_size = Path(new_path).stat().st_size
    reduction_percent = ((original_size - compressed_size) / original_size) * 100
    compression_time = int((time.time() - start_time) * 1000)

    # Create PDF record
    filename = output_filename or f"{pdf.filename[:-4]}_compressed.pdf"
    if not filename.endswith(".pdf"):
        filename += ".pdf"

    new_pdf = PDFDocument(
        id=new_pdf_id,
        user_id=self.current_user_id,
        filename=filename,
        file_size=compressed_size,
        pages_count=len(doc),
        metadata={
            "original_size": original_size,
            "compressed_size": compressed_size,
            "reduction_percent": round(reduction_percent, 1),
            "compression_time_ms": compression_time,
            "quality_level": quality_level,
        }
    )

    self.repo.create(new_pdf)
    return new_pdf
```

### Frontend

#### Compress Dialog

```tsx
// frontend/src/app/app/compress/CompressDialog.tsx

interface CompressDialogProps {
  pdf: PDFFile;
  onCompress: (
    pdfId: string,
    qualityLevel: number,
    outputFilename?: string,
  ) => void;
  onCancel: () => void;
}

export default function CompressDialog({
  pdf,
  onCompress,
  onCancel,
}: CompressDialogProps) {
  const t = useTranslations();
  const [qualityLevel, setQualityLevel] = useState(2);
  const [outputFilename, setOutputFilename] = useState(
    `${pdf.filename.replace(".pdf", "")}_compressed.pdf`,
  );
  const [loading, setLoading] = useState(false);

  const handleCompress = async () => {
    setLoading(true);
    try {
      await api.pdf.compress(pdf.id, qualityLevel, outputFilename);
      onCompress(pdf.id, qualityLevel, outputFilename);
    } catch (err) {
      alert(t("compress.error"));
    } finally {
      setLoading(false);
    }
  };

  const qualityDescriptions = {
    1: t("compress.highCompression"), // "High compression, lower quality"
    2: t("compress.mediumCompression"), // "Medium compression, medium quality"
    3: t("compress.lowCompression"), // "Low compression, high quality"
  };

  return (
    <dialog className="border rounded-lg p-6 space-y-6 max-w-md">
      <h2 className="text-lg font-bold">{t("compress.title")}</h2>

      <div>
        <p className="text-sm text-gray-600 mb-2">
          {t("compress.currentSize")}:{" "}
          <strong>{formatFileSize(pdf.file_size)}</strong>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-4">
          {t("compress.qualityLevel")}
        </label>

        <div className="space-y-3">
          {[1, 2, 3].map((level) => (
            <label key={level} className="flex items-center gap-3">
              <input
                type="radio"
                value={level}
                checked={qualityLevel === level}
                onChange={(e) => setQualityLevel(Number(e.target.value))}
                className="w-4 h-4"
              />
              <div>
                <p className="text-sm font-medium">
                  {t(`compress.level${level}`)}
                </p>
                <p className="text-xs text-gray-500">
                  {qualityDescriptions[level]}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="outputFilename"
          className="block text-sm font-medium mb-2"
        >
          {t("compress.outputFilename")}
        </label>
        <input
          id="outputFilename"
          type="text"
          value={outputFilename}
          onChange={(e) => setOutputFilename(e.target.value)}
          className="w-full px-3 py-2 border rounded dark:bg-gray-700"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {t("cancel")}
        </button>
        <button
          onClick={handleCompress}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? t("compress.compressing") : t("compress.compressButton")}
        </button>
      </div>
    </dialog>
  );
}
```

#### API Client

```typescript
// frontend/src/app/lib/api.ts
export const api = {
  pdf: {
    compress: async (
      pdfId: string,
      qualityLevel: number,
      outputFilename?: string,
    ) => {
      const response = await fetch(`${BASE_URL}/compress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`,
        },
        body: JSON.stringify({
          pdf_id: pdfId,
          quality_level: qualityLevel,
          output_filename: outputFilename,
        }),
      });
      return handleResponse(response);
    },
  },
};
```

#### Translation Keys

```json
// frontend/messages/en.json
{
  "compress": {
    "title": "Compress PDF",
    "currentSize": "Current size",
    "qualityLevel": "Compression Level",
    "level1": "High Compression",
    "level2": "Medium Compression (Recommended)",
    "level3": "Low Compression",
    "highCompression": "Highest reduction, reduced image quality",
    "mediumCompression": "Balanced reduction and quality",
    "lowCompression": "Minimal reduction, excellent quality",
    "outputFilename": "Output Filename",
    "compressButton": "Compress",
    "compressing": "Compressing...",
    "error": "Compression failed"
  }
}

// frontend/messages/it.json
{
  "compress": {
    "title": "Comprimi PDF",
    "currentSize": "Dimensione attuale",
    "qualityLevel": "Livello di Compressione",
    "level1": "Compressione Alta",
    "level2": "Compressione Media (Consigliato)",
    "level3": "Compressione Bassa",
    "highCompression": "Massima riduzione, qualità immagini ridotta",
    "mediumCompression": "Riduzione equilibrata e qualità",
    "lowCompression": "Riduzione minima, qualità eccellente",
    "outputFilename": "Nome File di Output",
    "compressButton": "Comprimi",
    "compressing": "Compressione in corso...",
    "error": "Compressione fallita"
  }
}
```

---

## Testing

```python
# backend/tests/test_compress.py

def test_compress_pdf_high_quality(db, user, pdf):
    """Compress with high compression level."""
    response = client.post(
        "/compress",
        json={
            "pdf_id": pdf.id,
            "quality_level": 1,
        },
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    compressed = response.json()
    assert compressed["file_size"] < pdf.file_size

def test_compression_preserves_pages(db, user, pdf):
    """Compression should not change page count."""
    response = client.post(
        "/compress",
        json={
            "pdf_id": pdf.id,
            "quality_level": 2,
        },
        headers={"Authorization": f"Bearer {token}"}
    )

    compressed = response.json()
    assert compressed["pages_count"] == pdf.pages_count
```

---

## Performance Considerations

1. **CPU-intensive operation**: Compression can take 5-30s depending on PDF size and quality level
2. **Async execution** (optional): Offload to Celery/RQ for large files
3. **Rate limiting**: Limit compression requests to prevent abuse

---

## Future Enhancements

- [ ] Batch compression (compress multiple PDFs)
- [ ] Async compression with progress notifications
- [ ] Image resolution adjustment slider
- [ ] Font subset removal option
- [ ] Metadata stripping option
- [ ] Quality preview before compression

---

## References

- PyMuPDF save options: https://pymupdf.readthedocs.io/en/latest/document.html#Document.save
- PDF Compression wiki: https://en.wikipedia.org/wiki/PDF#Compression
