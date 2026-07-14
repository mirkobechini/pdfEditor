# Bug B11: `logout()` non gestisce errori — eccezione blocca pulizia stato

**Status:** [ ] Non iniziata
**Priority:** HIGH
**Complexity:** Low

## Problema

In `frontend/src/app/lib/auth.tsx`, `logout()` chiama `await api.logout()`. Se lancia eccezione, `setToken(null)` e `setUser(null)` non vengono eseguiti. L'utente rimane con stato "loggato" anche se voleva uscire.

## Soluzione

Usare try/finally: `setToken(null)` e `setUser(null)` devono sempre eseguire, anche se `api.logout()` fallisce.

## File da modificare

- `frontend/src/app/lib/auth.tsx`
