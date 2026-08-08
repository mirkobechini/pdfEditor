# Bug Fix Plan: Large File Upload Progress Indicator

**Status:** ✅ Completata (2026-07-11, PR #206)
**Priority:** MEDIA (UX Improvement)
**Severity:** Medium
**Complexity:** Low
**Estimated Time:** 2-3 hours

---

## Problem Statement

Quando l'utente carica un file PDF di grandi dimensioni (es. >10MB), non c'è alcun indicatore di progresso. L'interfaccia sembra bloccata/freeze fino al completamento dell'upload.

**Osservato in:**

- Upload via drag & drop nella Sidebar
- Upload via click sul pulsante "Drop PDF here"

**Impatto:**

- UX confusa: utente non sa se l'upload è in corso o bloccato
- Abbandono prematuro: utente potrebbe ricaricare la pagina pensando sia crashata
- Nessun feedback visivo per file grandi

---

## Solution

### Frontend

#### 1. Aggiungere progress bar alla Sidebar

```tsx
// frontend/src/app/components/Sidebar.tsx
const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
const [uploading, setUploading] = React.useState(false);

async function handleUpload(file: File) {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    alert(t("uploadOnlyPdf"));
    return;
  }
  setUploading(true);
  setUploadProgress(0);
  try {
    const doc = await api.uploadPdf(file, (progress) => {
      setUploadProgress(progress);
    });
    setFiles((prev) => [doc, ...prev]);
    onUpload(doc);
    onSelect(doc.id);
  } catch (err) {
    alert(t("uploadFailed") + ": " + err);
  } finally {
    setUploading(false);
    setUploadProgress(null);
  }
}
```

#### 2. Usare XMLHttpRequest per tracciare progresso

```typescript
// frontend/src/app/lib/api.ts
async uploadPdf(file: File, onProgress?: (progress: number) => void): Promise<PdfDocument> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${this.baseUrl}/pdfs/upload`);

    // Set auth header
    if (this.token) {
      xhr.setRequestHeader("Authorization", `Bearer ${this.token}`);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(xhr.statusText));
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}
```

#### 3. UI Progress Bar

```tsx
// In Sidebar.tsx, inside the upload area
{
  uploading && uploadProgress !== null && (
    <div className="mt-2">
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${uploadProgress}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
    </div>
  );
}
```

---

## Files to Modify

**Frontend:**

- `frontend/src/app/lib/api.ts` — Add XMLHttpRequest-based upload with progress callback
- `frontend/src/app/components/Sidebar.tsx` — Add progress state and UI

---

## Acceptance Criteria

- [ ] Progress bar visible during upload
- [ ] Percentage shown
- [ ] Bar animates smoothly
- [ ] On completion, bar disappears and file appears in sidebar
- [ ] On error, bar disappears and error message shown
- [ ] Works for both drag & drop and click upload
