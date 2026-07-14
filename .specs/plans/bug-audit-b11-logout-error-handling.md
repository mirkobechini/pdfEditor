# Bug B11: `logout()` non gestisce errori — eccezione blocca pulizia stato

**Status:** [x] Completata (2026-07-14, PR #308)
**Priority:** HIGH
**Complexity:** Low

## Problema

`logout()` chiamava `await api.logout()` senza try/finally — se lanciava eccezione, lo stato non veniva mai pulito.

## Soluzione

Usato try/finally: `setToken(null)` e `setUser(null)` eseguiti sempre.
