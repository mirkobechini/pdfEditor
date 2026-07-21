# Bug B12: Check dimensione file inconsistente in convert.py

**Status:** [x] Completata (2026-07-14, PR #310)
**Priority:** MEDIUM
**Complexity:** Low

## Problema

`convert.py` usava `>` mentre `upload.py` usava `>=` — inconsistenza.

## Soluzione

Uniformato a `>=` come in `upload.py`.
