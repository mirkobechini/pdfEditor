# Bug: Upload PDF 403 CSRF validation failed

## Obiettivo

Risolvere l'errore 403 CSRF sull'upload PDF tramite il sidecar locale dopo login cloud.

## Sintomo

```
POST http://127.0.0.1:7723/pdfs/upload 403 (Forbidden)
Upload failed: Error: CSRF validation failed
```

Il login funziona (cloud → utente riconosciuto), ma l'upload dà 403.

## Diagnosi

1. **POST /auth/sync → 200 OK** ✅ — Endpoint funzionante, restituisce JWT locale + CSRF
2. **Cookie CSRF non inviato** ❌ — Il cookie `csrf_token` è impostato con `SameSite=Lax`, ma la richiesta upload è cross-site (origin `http://tauri.localhost` → target `http://127.0.0.1:7723`) → il browser non lo invia su POST
3. **Conseguenza**: il server confronta `X-CSRF-Token` (inviato) con il cookie (non inviato) → mismatch → 403

## Soluzione proposta

### Fix backend (`backend/app/core/csrf.py`)
Rilevare se la connessione è su localhost e usare `SameSite=None, Secure=False`. Chrome/Edge permettono `SameSite=None` senza `Secure` su localhost.

### Fix frontend (`shared/src/auth.tsx`)
Già fixato: `await api.syncUser(u)` mancante (non aspettava il completamento).

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