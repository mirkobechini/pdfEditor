# Bug B17: Google OAuth certs lookup — dead code `if` block

**Status:** [x] Completata (2026-07-15, PR #320)
**Priority:** MEDIUM
**Complexity:** Low

## Problema

Il controllo `if kid not in certs.get("keys", {})` non funzionava — `keys` e una lista, non un dict. Dead code.

## Soluzione

Rimosso il `if/else` morto, mantenuto solo il loop manuale.
