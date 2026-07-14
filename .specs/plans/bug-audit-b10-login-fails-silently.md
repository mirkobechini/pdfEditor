# Bug B10: `login()` fallisce silenziosamente — token settato ma UI non aggiornata

**Status:** [ ] Non iniziata
**Priority:** HIGH
**Complexity:** Low

## Problema

In `frontend/src/app/lib/auth.tsx`, `login()` chiama `api.login()` (setta il token), poi `api.getMe()`. Se `getMe()` fallisce (network error, server error), il `finally { setLoading(false) }` esegue — l'utente vede `loading=false, user=null` nonostante abbia un token valido.

## Soluzione

Se `getMe()` fallisce dopo login riuscito, ritentare o fare redirect a `/` che triggera il mount `useEffect` che fa `getMe()` automaticamente.

## File da modificare

- `frontend/src/app/lib/auth.tsx`
