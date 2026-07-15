# Bug B18: `_password_cache` globale non pulita su shutdown

**Status:** [x] Completata (2026-07-15, PR #322)
**Priority:** MEDIUM
**Complexity:** Low

## Problema

`_password_cache` conteneva password in chiaro in memoria senza cleanup su shutdown.

## Soluzione

Aggiunta `_clear_password_cache()` e chiamata da `_cleanup_on_shutdown()`.
