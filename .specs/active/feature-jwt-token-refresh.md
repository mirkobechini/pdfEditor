# Feature: JWT token refresh automatico (mobile + backend)

## Obiettivo

Evitare che l'utente mobile debba rifare il login ogni ora quando il token JWT scade, tramite un endpoint di refresh che emette un nuovo token automaticamente.

---

## Contesto

- `ACCESS_TOKEN_EXPIRE_MINUTES: 60` — il token JWT scade dopo **1 ora**
- Il mobile salva il token in AsyncStorage (`REMEMBER_TOKEN_KEY`) e lo usa per le API cloud
- Quando scade, ogni operazione autenticata (upload, listPdfs, download) fallisce con `INVALID_CREDENTIALS`
- L'utente è costretto a logout + login ogni ora per continuare a sincronizzare
- Non esiste alcun endpoint di refresh token nel backend

---

## Decisioni prese

- **Opzione B**: aggiungere un endpoint `/auth/refresh` che emette un nuovo token quando quello corrente scade
- Il mobile, al ricevere un `401`/`INVALID_CREDENTIALS`, chiama automaticamente `/auth/refresh` e riprova la richiesta
- Se il refresh fallisce (es. token troppo vecchio o revocato), l'utente deve rifare login

---

## Componenti

### R1 — Backend: endpoint `POST /auth/refresh`

**File:** `backend/app/api/v1/auth.py`, `backend/app/schemas/auth.py`

- Accetta il token JWT corrente (scaduto o in scadenza) via `Authorization: Bearer` o cookie
- **Valida il token anche se scaduto**: decodifica ignorando `exp` (`jwt.decode(..., options={"verify_exp": False})`)
- Verifica che l'utente esista ancora e sia attivo
- Se il token scaduto è **troppo vecchio** (es. > 30 giorni), rifiuta il refresh → l'utente deve rifare login
- Emette un nuovo token con `create_access_token(data={"sub": user.id})`
- Risponde `TokenResponse` (access_token + csrf_token)
- Risposta 401 se il token non è valido o troppo vecchio

**Nuova funzione in `backend/app/core/security.py`:**

```python
def decode_access_token_ignore_exp(token: str) -> dict | None:
    try:
        return jwt.decode(
            token,
            settings.effective_secret_key,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": False},
        )
    except jwt.InvalidTokenError:
        return None
```

**Logica refresh:**

```python
@router.post("/refresh", response_model=TokenResponse)
def refresh_token(request: Request, response: Response, ...):
    token = _get_token(request)
    if not token:
        raise HTTPException(401, ...)
    # Decode ignoring exp to get user id + exp claim
    payload = decode_access_token_ignore_exp(token)
    if not payload:
        raise HTTPException(401, ...)
    user_id = payload.get("sub")
    # Check token age: reject if older than REFRESH_TOKEN_MAX_AGE_DAYS (30)
    exp = payload.get("exp")
    if exp and (now - datetime.fromtimestamp(exp)) > timedelta(days=settings.REFRESH_TOKEN_MAX_AGE_DAYS):
        raise HTTPException(401, "REFRESH_TOKEN_EXPIRED")
    # Validate user still exists and is active
    user = service.get_user_by_id(user_id)
    if not user or not user.is_active:
        raise HTTPException(401, ...)
    # Issue new token
    new_token = create_access_token(data={"sub": user.id})
    csrf_token = generate_csrf_token()
    _set_token_cookie(response, new_token)
    set_csrf_cookie(response, csrf_token, request=request)
    return TokenResponse(access_token=new_token, csrf_token=csrf_token)
```

**Config:** aggiungere `REFRESH_TOKEN_MAX_AGE_DAYS: int = 30` in `backend/app/core/config.py`

### R2 — Mobile: `api.ts` con retry automatico

**File:** `mobile/src/shared/api.ts`

- Aggiungere metodo `refreshToken(): Promise<{ access_token: string; csrf_token: string }>`
- Modificare `_fetch` per:
  1. Se la risposta è `401`/`INVALID_CREDENTIALS`, chiamare `refreshToken()`
  2. Se il refresh riesce: aggiornare `this.token` e ritentare la richiesta originale UNA volta
  3. Se il refresh fallisce: lanciare l'errore originale (e la UI mostra "sessione scaduta")
- Usare un flag `isRefreshing` per evitare refresh concorrenti (più richieste fallite insieme)

**Schema:**

```ts
async refreshToken(): Promise<{ access_token: string; csrf_token: string }> {
    const res = await this._fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractErrorResponse(res));
    const data = await res.json();
    if (data.csrf_token) this.setCsrfToken(data.csrf_token);
    this.setToken(data.access_token);
    return data;
}
```

### R3 — Mobile: `auth.tsx` — persistenza nuovo token

**File:** `mobile/src/shared/auth.tsx`

- Dopo un refresh riuscito, aggiornare `AsyncStorage` (`REMEMBER_TOKEN_KEY`) con il nuovo token
- Esporre `refreshToken()` nel context (o un callback che `api.ts` può chiamare per aggiornare lo storage)
- Se il refresh fallisce e l'utente ha un token salvato: invalidare il token salvato e forzare il logout pulito (utente torna al login)

---

## File coinvolti

```
backend/app/core/security.py        # R1 — decode_access_token_ignore_exp
backend/app/core/config.py          # R1 — REFRESH_TOKEN_MAX_AGE_DAYS
backend/app/api/v1/auth.py          # R1 — POST /auth/refresh
backend/app/schemas/auth.py         # R1 — riuso TokenResponse
backend/tests/test_auth.py          # R1 — test refresh endpoint
mobile/src/shared/api.ts            # R2 — refreshToken + retry in _fetch
mobile/src/shared/auth.tsx          # R3 — persistenza nuovo token + logout on fail
mobile/src/hooks/useCloudSync.ts    # già gestisce INVALID_CREDENTIALS
```

---

## Test

### Backend (`backend/tests/test_auth.py`)

- `POST /auth/refresh` con token valido → 200 + nuovo token
- `POST /auth/refresh` con token scaduto ma recente (< 30 giorni) → 200 + nuovo token
- `POST /auth/refresh` con token scaduto da > 30 giorni → 401
- `POST /auth/refresh` con token invalido → 401
- `POST /auth/refresh` senza token → 401
- `POST /auth/refresh` per utente disattivato → 401

### Mobile

- Sync dopo scadenza token → refresh automatico → sync riesce (nessun login)
- Token troppo vecchio → messaggio "sessione scaduta, rifai login"

---

## Ordine esecuzione

1. **R1** — Backend: `decode_access_token_ignore_exp` + config + endpoint `/auth/refresh` + test
2. **R2** — Mobile: `api.ts` con `refreshToken()` + retry in `_fetch`
3. **R3** — Mobile: `auth.tsx` persistenza + logout su refresh fallito
4. Build + test end-to-end

---

## Status

[ ] Non iniziata
