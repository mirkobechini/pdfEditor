# Feature: Unit Tests for pdfPreview.ts

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

- [ ] File test creato: pdfPreview.test.ts
- [ ] 6+ test cases implementati
- [ ] Coverage >80% di pdfPreview.ts
- [ ] Tutti i test passano: `npm run test:frontend`
- [ ] Nessun warning in output test

## Status

- [ ] Non iniziata
- [ ] In progress
- [ ] In review
- [ ] Completata

## Timeline

Stimato: 1.5 ore (setup mock + test writing)

## Note

- Mock di globalThis.pdfjsLib e window.HTMLCanvasElement.getContext
- Usare factory function per create mock PDF document
- Test both success and error paths
