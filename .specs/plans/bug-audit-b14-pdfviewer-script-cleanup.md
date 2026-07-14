# Bug B14: Cleanup script tag PdfViewer rompe multi-instanza

**Status:** [ ] Non iniziata
**Priority:** HIGH
**Complexity:** Low

## Problema

In `frontend/src/app/components/PdfViewer.tsx`, il cleanup effect rimuove il tag `<script>` di PDF.js dal DOM quando il componente smonta. Se DUE PdfViewer sono montati, il primo che smonta rimuove lo script necessario al secondo.

## Soluzione

Non rimuovere il tag script dal DOM nel cleanup — come già fa `usePdfJs.ts`. Il CDN è cached dal browser, un secondo script non viene ricaricato ma è comunque safe non rimuoverlo.

## File da modificare

- `frontend/src/app/components/PdfViewer.tsx`
