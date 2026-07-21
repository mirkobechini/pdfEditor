# Bug B21: `handleEditText` dead code — mai chiamata

**Status:** [x] Completata (2026-07-15, PR #328)
**Priority:** MEDIUM
**Complexity:** Low

## Problema

`handleEditText` era una funzione con TODO, mai chiamata, che scaricava il PDF senza modificarlo.

## Soluzione

Rimossa la funzione.
