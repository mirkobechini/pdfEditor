# Hotfix: Landing page 401 loop — AuthProvider infinite re-renders

**Issue:** #385

## Problema

Sulla landing page (utente non loggato), `GET /auth/me` torna 401 (comportamento corretto), ma React entra in un loop infinito di re-render. Lo stack trace mostra la chiamata `getMe()` ripetuta decine di volte con catena React `ud`/`up`/`sx`.

## Causa

L'`AuthProvider` chiama `getMe()` all'mount del componente via `useEffect([], [])`. Se per qualsiasi motivo il componente si smonta e rimonta (es. StrictMode, Suspense, o un padre che cambia stato), il useEffect riesegue `getMe()` → 401 → loop.

Il problema è amplificato in produzione perché:

- La risposta `401` è più lenta (RTT vero vs locale)
- Il `catch` silenzioso non interrompe il loop
- Potrebbe esserci un race condition con `_pendingAuthRef`

## Fix

### 1. Guard `_hasChecked` in AuthProvider

Aggiungere un ref `_hasChecked` che viene impostato a `true` dopo la prima esecuzione del `getMe()`. Se il componente si rimonta, non ri-esegue la chiamata.

### 2. (Bonus) Skip su pagine pubbliche

Se non c'è un cookie `access_token` (leggibile solo same-origin, ma su Cloudflare/Render abbiamo lo stesso dominio? No, domini diversi), meglio saltare direttamente. Alternativa: controllare `document.cookie` per `access_token` — ma in produzione cross-origin non è leggibile.

**Fix più robusto:** usare un flag `_hasChecked` con persistenza fuori dal ciclo di vita di React (es. modulo globale o sessionStorage).

## Test

- AuthProvider deve chiamare `getMe()` **una sola volta** all'avvio
- Se riceve 401, deve impostare `loading=false` e `user=null` senza loop
- Test frontend esistente in `auth.test.tsx` deve ancora passare

## Commits previsti

1. fix(ui): add \_hasChecked guard to prevent AuthProvider getMe loop
2. test(ui): update auth tests for single getMe invocation

## Status

[ ] Non iniziata (ancora da fare)
