# Feature Plan: CSRF Protection

**Status:** ✅ Completata (2026-07-11, PR #214)
**Priority:** MEDIA (Security)
**Complexity:** Medium
**Estimated Time:** 2-3 ore

---

## Obiettivo

Aggiungere protezione CSRF (Cross-Site Request Forgery) al backend FastAPI.

## Contesto

Attualmente:

- `allow_credentials=True` in CORS
- Nessun token CSRF
- JWT in localStorage (inviato via `Authorization: Bearer` header)

**Nota:** Finché il JWT è in localStorage (non in cookie), il rischio CSRF è basso perché il browser non invia automaticamente l'header `Authorization`. Tuttavia, quando migreremo a JWT httpOnly cookie (prossimo task), la protezione CSRF diventa **obbligatoria**.

## Strategia

### Backend

#### 1. Middleware CSRF

```python
# backend/app/core/csrf.py
import secrets
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

class CSRFMiddleware(BaseHTTPMiddleware):
    """CSRF protection middleware.

    - GET/HEAD/OPTIONS: set CSRF cookie if not present
    - POST/PUT/DELETE/PATCH: validate CSRF token from header vs cookie
    """

    async def dispatch(self, request: Request, call_next):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            response = await call_next(request)
            if "csrf_token" not in request.cookies:
                token = secrets.token_hex(32)
                response.set_cookie(
                    key="csrf_token",
                    value=token,
                    httponly=True,
                    samesite="strict",
                    secure=True,  # False in dev
                )
            return response

        # State-changing methods: validate CSRF
        csrf_cookie = request.cookies.get("csrf_token")
        csrf_header = request.headers.get("X-CSRF-Token")

        if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF validation failed",
            )

        return await call_next(request)
```

#### 2. Registrare in main.py

```python
# backend/app/main.py
from app.core.csrf import CSRFMiddleware
app.add_middleware(CSRFMiddleware)
```

### Frontend

#### 1. API Client — Invia CSRF token

```typescript
// frontend/src/app/lib/api.ts
private async fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
  // Read CSRF token from cookie
  const csrfToken = document.cookie
    .split("; ")
    .find(row => row.startsWith("csrf_token="))
    ?.split("=")[1];

  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
  };

  if (csrfToken && options.method && !["GET", "HEAD"].includes(options.method)) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  return fetch(url, { ...options, headers });
}
```

## Files da modificare

**Backend:**

- `backend/app/core/csrf.py` — Nuovo middleware CSRF
- `backend/app/main.py` — Registrare middleware

**Frontend:**

- `frontend/src/app/lib/api.ts` — Aggiungere CSRF token a tutte le richieste

## Acceptance Criteria

- [ ] GET/HEAD/OPTIONS impostano cookie CSRF
- [ ] POST/PUT/DELETE richiedono header X-CSRF-Token valido
- [ ] Richieste senza CSRF token ricevono 403
- [ ] Frontend invia CSRF token automaticamente
- [ ] Tutti i test passano

## Dipendenze

- Questo task DEVE essere fatto PRIMA della migrazione JWT httpOnly cookie
- Può essere fatto anche prima (non rompe nulla con JWT in localStorage)
