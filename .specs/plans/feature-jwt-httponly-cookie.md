# Feature Plan: JWT httpOnly Cookie Migration

**Status:** Planning
**Priority:** ALTA (Security)
**Complexity:** HIGH
**Estimated Time:** 4-6 ore

---

## Obiettivo

Migrare lo storage del JWT da `localStorage` a **httpOnly cookie**, eliminando la vulnerabilità XSS.

## Contesto

Attualmente:

- JWT salvato in `localStorage` con chiave `pdfeditor_token`
- Inviato manualmente via `Authorization: Bearer` header
- **Vulnerabile a XSS**: un attacco XSS può leggere `localStorage` e rubare il token

Con httpOnly cookie:

- Il browser gestisce il cookie automaticamente
- JavaScript **non può leggere** il cookie (httpOnly flag)
- Il cookie viene inviato automaticamente con ogni richiesta
- **Serve CSRF protection** (task precedente)

## Strategia

### Backend

#### 1. Endpoint login/register — Setta cookie invece di restituire token

```python
# backend/app/api/v1/auth.py
from fastapi.responses import JSONResponse

@router.post("/login")
def login(req: UserLoginRequest, ...):
    user, token = service.login(req.email, req.password)

    response = JSONResponse(content={"user": UserResponse.model_validate(user)})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=True,  # False in dev
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    return response
```

#### 2. Auth dependency — Legge da cookie invece di Authorization header

```python
# backend/app/api/deps.py
from fastapi import Request

async def get_current_user_from_cookie(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    # ... decode JWT ...
```

#### 3. Mantenere backward compatibility (Authorization header)

Per non rompere i test e client esterni, supportare entrambi:

```python
async def get_token(request: Request) -> str | None:
    # Try cookie first, then Authorization header
    token = request.cookies.get("access_token")
    if token:
        return token
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        return auth[7:]
    return None
```

### Frontend

#### 1. Rimuovere gestione manuale del token

```typescript
// frontend/src/app/lib/auth.tsx — MODIFICHE

// PRIMA: salvava in localStorage
localStorage.setItem(TOKEN_KEY, res.access_token);

// DOPO: il backend setta il cookie, il frontend non fa nulla
// Il browser invierà il cookie automaticamente
```

#### 2. API Client — Rimuovere Authorization header

```typescript
// frontend/src/app/lib/api.ts
// PRIMA: setToken() + getHeaders() con Authorization
// DOPO: il cookie viene inviato automaticamente, niente header manuale
```

#### 3. AuthContext — Non gestire più il token

```typescript
// frontend/src/app/lib/auth.tsx
// Rimuovere: token state, setTokenState, TOKEN_KEY
// Il login ora fa POST e riceve un cookie, non un token JSON
```

### Test

#### Backend

- Aggiornare `conftest.py` per supportare cookie-based auth
- I test esistenti usano `Authorization: Bearer` — mantenerli funzionanti

#### Frontend

- Aggiornare test per nuovo flusso auth

## Files da modificare

**Backend:**

- `backend/app/api/v1/auth.py` — Setta cookie su login/register/google
- `backend/app/api/deps.py` — Legge token da cookie + header
- `backend/app/main.py` — Configurazione cookie (secure, samesite)
- `backend/tests/conftest.py` — Aggiornare fixture auth

**Frontend:**

- `frontend/src/app/lib/auth.tsx` — Rimuovere gestione token
- `frontend/src/app/lib/api.ts` — Rimuovere setToken/getHeaders
- `frontend/src/app/components/HeaderControls.tsx` — Aggiornare logout
- `frontend/src/app/app/page.tsx` — Verificare flusso auth

## Acceptance Criteria

- [ ] Login setta cookie httpOnly
- [ ] Il cookie viene inviato automaticamente dal browser
- [ ] Logout cancella il cookie
- [ ] Refresh pagina mantiene autenticazione
- [ ] Authorization header ancora supportato (backward compat)
- [ ] localStorage non contiene più il token
- [ ] Tutti i test passano (backend + frontend)
- [ ] CSRF protection attiva (task precedente)

## Dipendenze

- ⚠️ **DEVE essere fatto DOPO CSRF protection** (altrimenti vulnerabile a CSRF)
- Richiede modifiche sia backend che frontend
