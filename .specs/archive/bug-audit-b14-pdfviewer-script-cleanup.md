# Bug B14: Cleanup script tag PdfViewer rompe multi-instanza

**Status:** [x] Completata (2026-07-14, PR #314)
**Priority:** HIGH
**Complexity:** Low

## Problema

Il cleanup effect rimuoveva il tag script PDF.js dal DOM — se due PdfViewer erano montati, il primo che smontava rompeva il secondo.

## Soluzione

Rimosso il cleanup che rimuoveva lo script (come gia fa usePdfJs.ts).
