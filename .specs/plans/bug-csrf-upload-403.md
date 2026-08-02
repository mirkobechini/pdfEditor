# Bug: Upload PDF 403 CSRF validation failed

## Obiettivo

Risolvere l'errore 403 CSRF sull'upload PDF tramite il sidecar locale dopo login cloud.

## Sintomo

```
POST http://127.0.0.1:7723/pdfs/upload 403 (Forbidden)
Upload failed: Error: CSRF validation failed
```

Il login funziona (cloud → utente riconosciuto), ma l'upload dà 403.

## Diagnosi (da verificare)

1. **Flusso attuale**: login cloud → `api.setToken(token_cloud)` → `api.getMe()` fallisce (utente non in SQLite locale) → `cloudApi.getMe()` → `api.syncUser(u)` → salva utente in locale + emette JWT locale
2. **Problema sospetto**: `api.syncUser()` restituisce `{ access_token: jwt_locale, csrf_token }` ma il frontend **non aggiorna** `api.setToken()` con il JWT locale. Il client continua a usare il token cloud per le chiamate al sidecar.
3. **Conseguenza**: `/auth/csrf` sul sidecar riceve token cloud → `get_current_user()` fallisce (firmato con SECRET_KEY diversa) → 401 → CSRF non arriva mai

## Soluzione proposta

### Fix frontend (`shared/src/auth.tsx`)
Dopo `api.syncUser(u)`, usare il nuovo token restituito:
```typescript
const syncResult = await api.syncUser(u);
if (syncResult?.access_token) {
  api.setToken(syncResult.access_token);
  api.setCsrfToken(syncResult.csrf_token);
}
```
In questo modo il sidecar riconosce l'utente e `/auth/csrf` funziona.

## Stack

- `shared/src/auth.tsx` — login/register/restoreSession flow
- `shared/src/api.ts` — `syncUser()` già implementato
- `backend/app/api/v1/auth.py` — `POST /auth/sync` già implementato

## Output atteso

Dopo login cloud, upload PDF via sidecar funziona senza 403.

## Test

1. Login con cloud → upload PDF → 200 OK

## Status

[x] Non iniziata