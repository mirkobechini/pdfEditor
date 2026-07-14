# Bug B13: Race condition `getMe()` iniziale — flash "logged out"

**Status:** [ ] Non iniziata
**Priority:** HIGH
**Complexity:** Medium

## Problema

In `frontend/src/app/lib/auth.tsx`, il `useEffect` iniziale chiama `api.getMe()`. Se l'utente chiama `login()` (che chiama `getMe()` di nuovo) prima che il primo `getMe()` risolva, due `getMe()` concorrono. Il `.finally(() => setLoading(false))` del primo può settare `loading=false` prima che il `getMe` della login finisca, causando un flash "logged out".

## Soluzione

Usare un ref (`isFetchingRef`) o un counter per ignorare `getMe` response obsolete. Oppure usare `AbortController` per cancellare la richiesta iniziale quando si fa login.

## File da modificare

- `frontend/src/app/lib/auth.tsx`
