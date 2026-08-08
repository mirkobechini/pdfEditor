# Chore: Extract Shared usePdfJs Hook

**Status:** ✅ Completata (2026-07-12, PR #220)
**Priority:** MEDIA (Refactoring)
**Complexity:** Low
**Estimated Time:** 1 hour

---

## Problema

`SplitDialog.tsx`, `ReorderDialog.tsx`, `RemoveDialog.tsx` hanno **lo stesso identico codice** per caricare PDF.js:

```tsx
// Stesso codice in 3 file diversi
React.useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).pdfjsLib) {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = "...";
        setPdfJsLoaded(true);
        return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = "...";
        setPdfJsLoaded(true);
    };
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
}, []);
```

## Soluzione

Estrarre in un hook condiviso:

```typescript
// frontend/src/app/lib/usePdfJs.ts
"use client";

import { useState, useEffect } from "react";

const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

export function usePdfJs(): boolean {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        if ((window as any).pdfjsLib) {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
            setLoaded(true);
            return;
        }

        const script = document.createElement("script");
        script.src = PDFJS_URL;
        script.async = true;
        script.onload = () => {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
            setLoaded(true);
        };
        document.body.appendChild(script);

        return () => {
            // Don't remove the script — other components may be using it
        };
    }, []);

    return loaded;
}
```

## Files da creare

- `frontend/src/app/lib/usePdfJs.ts`

## Files da modificare

- `frontend/src/app/components/SplitDialog.tsx` — Usa `usePdfJs()`
- `frontend/src/app/components/ReorderDialog.tsx` — Usa `usePdfJs()`
- `frontend/src/app/components/RemoveDialog.tsx` — Usa `usePdfJs()`

## Acceptance Criteria

- [ ] Hook funziona in tutti e 3 i dialoghi
- [ ] PDF.js caricato una sola volta (non 3)
- [ ] 131 test frontend passano
- [ ] 228 test backend passano