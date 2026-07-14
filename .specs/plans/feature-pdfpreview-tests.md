# Feature: Unit Tests for pdfPreview.ts

**Status:** ✅ Completata (2026-07-12)

**Issue Number**: issue-137

## Obiettivo

Scrivere test vitest completi per la funzione `renderFirstPageToDataUrl()` in `frontend/src/app/lib/pdfPreview.ts`. Attualmente non ha copertura di test.

## Problema

`pdfPreview.ts` è usato da 4 componenti (DeleteModal, SplitDialog, RemoveDialog, ReorderDialog) ma non ha test. Aumentare code coverage.

## Dipendenze

- File: frontend/src/app/lib/pdfPreview.ts
- Setup: vitest + jsdom + canvas mock

## Stack

- Testing: vitest 1.x + @testing-library/react
- Mock: vi.mock() per PDF.js globale
- Canvas API mock via mock di window.HTMLCanvasElement

## Output atteso

✅ Test file: `frontend/src/app/lib/pdfPreview.test.ts` con:

1. Test renderFirstPageToDataUrl() con PDF valido
2. Test fallback quando PDF.js non è caricato
3. Test errore nel rendering page
4. Test canvas rendering con scale corretto
5. Test data URL output è valido PNG
6. Mock completo di pdfjsLib.getDocument()

## Accettazione Criteria

- [x] File test creato: pdfPreview.test.ts
- [x] 7 test cases implementati (6 previsti + 1 extra)
- [x] Coverage >80% di pdfPreview.ts (testate tutte le funzioni + paths)
- [x] Tutti i test passano: `npm run test:frontend`
- [ ] Nessun warning in output test

## Status

- [ ] Non iniziata
- [ ] In progress
- [ ] In review
- [x] ✅ Completata (merged to dev - PR #137)

## Timeline

Stimato: 1.5 ore (setup mock + test writing)

## Note

- Mock di globalThis.pdfjsLib e window.HTMLCanvasElement.getContext
- Usare factory function per create mock PDF document
- Test both success and error paths

## Implementation Details

**File creato:**

- `frontend/src/app/lib/pdfPreview.test.ts` — 7 test unitari

**Mock pattern usato:**

```typescript
const originalCreateElement = document.createElement.bind(document);
vi.spyOn(document, "createElement").mockImplementation((tagName) => {
  if (tagName === "canvas") return wrapCanvas(originalCreateElement(tagName));
  return originalCreateElement(tagName);
});
```

Usato il salvataggio di `originalCreateElement` per evitare ricorsione infinita.

**7 test cases:**

1. ✅ renderFirstPageToDataUrl — success path
2. ✅ Dynamic PDF.js loading via script tag
3. ✅ Error when PDF.js fails to load
4. ✅ Error when PDF document fails to load
5. ✅ Error when page rendering fails
6. ✅ HiDPI rendering with devicePixelRatio=2
7. ✅ Graceful handling of missing devicePixelRatio

**Commits merged:** 1 commit (PR #137)

- `test(ui): fix mock patterns and add 7 unit tests for renderFirstPageToDataUrl (issue-137)`
