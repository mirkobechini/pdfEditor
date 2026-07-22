# Feature: Connected Services in Profile Page

**Issue:** #389

## Obiettivo

Mostrare i servizi collegati all'account (es. Google) nella pagina profilo, con possibilità di collegare o scollegare.

## Stato attuale

- `User` model ha campo `google_id` (DB, nullable)
- `UserResponse` **NON** espone `google_id` — va aggiunto
- `GET /auth/me` non dice se Google è collegato
- Non esiste endpoint per scollegare Google

## Cosa implementare

### 1. Backend — Esporre `google_id` in UserResponse

Aggiungere `google_id: str | None` a `UserResponse` in `schemas/auth.py`.

### 2. Backend — Endpoint `POST /auth/unlink/google`

Scollega Google dall'account corrente. Richiede conferma password (per sicurezza). Azzera `google_id` nel DB.

**Sicurezza:** richiedere password corrente per scollegare (non basta essere autenticati).

```python
@router.post("/unlink/google", response_model=UserResponse)
def unlink_google(
    req: UnlinkGoogleRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> UserResponse:
```

### 3. Frontend — Sezione "Servizi collegati" in `/profile`

Nella pagina profilo, sotto i dati utente, aggiungere una card:

- **Google:** se collegato → mostra `google_id` (troncato) + bottone "Scollega"
- **Google:** se non collegato → bottone "Collega Google" (riusa GoogleLoginButton)

### 4. Frontend — Modal conferma scollegamento

Prima di scollegare, mostrare un modal di conferma con input password.

## Dipendenze

- `UserResponse` va modificato
- L'endpoint login/register/google restituisce già `csrf_token` nel body (PR #381)

## UI Mock

```
┌─────────────────────────────────┐
│ 👤 Il tuo profilo               │
│ Email: mario@example.com        │
│ Nome: Mario Rossi               │
│ Membri dal: 2026-01-01          │
│                                 │
│ ─── Servizi collegati ──────── │
│                                 │
│ 🔵 Google                       │
│    Collegato: mario@gmail.com   │
│    [Scollega]                   │
│                                 │
│ ⚪ Apple                         │
│    [Non disponibile]            │
└─────────────────────────────────┘
```

## Commits previsti

1. feat(api): expose google_id in UserResponse schema
2. feat(api): add POST /auth/unlink/google endpoint
3. feat(ui): add connected services section to profile page
4. test(api): add tests for unlink endpoint
5. test(ui): update profile tests

## Status

[x] Completata (2026-07-22, PR #390)
