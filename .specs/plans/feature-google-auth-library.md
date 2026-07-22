# Feature: Replace manual PyJWT Google token validation with google-auth-library

**Issue:** #386

## Obiettivo

Sostituire la validazione manuale del token Google SSO (PyJWT + `requests.get` a Google certs) con la libreria ufficiale `google-auth-library`.

## Problema

Il codice attuale in `auth_service.py` fa:

```python
# ❌ Ad ogni login:
resp = requests.get("https://www.googleapis.com/oauth2/v3/certs", timeout=10)
certs = resp.json()
header = jwt.get_unverified_header(id_token)
# matching manuale kid → chiave
# jwt.decode(id_token, key, ...)
```

**Problemi:**

1. **Nessuna cache** — scarica le chiavi pubbliche Google ad ogni login (+200-500ms)
2. **Implementazione manuale** — soggetta a bug (key rotation, edge case)
3. **Due librerie** (`requests` + `PyJWT`) per una cosa che Google già fornisce

## Fix

Usare `google-auth`:

```python
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

info = id_token.verify_oauth2_token(
    id_token_str,
    google_requests.Request(),
    settings.GOOGLE_CLIENT_ID,
)
```

## Vantaggi

| Aspetto      | Prima (PyJWT manuale) | Dopo (google-auth)     |
| ------------ | --------------------- | ---------------------- |
| Cache chiavi | ❌ Nessuna            | ✅ Automatica (24h)    |
| Validazione  | Manuale (kid match)   | Ufficiale Google       |
| Key rotation | Rischio bug           | ✅ Gestita             |
| Performance  | +200-500ms per login  | ✅ Istantaneo (cached) |
| Linee codice | ~40 righe             | ~5 righe               |

## Dipendenze

Aggiungere a `requirements.txt`:

```
google-auth>=2.0.0
```

## Test

- Il test `test_google_login` esistente deve essere aggiornato per mockare `google.auth` invece di `requests.get`
- Coverage invariata (stessa logica, meno codice)

## Commits previsti

1. feat(deps): add google-auth to requirements.txt
2. refactor(api): replace manual PyJWT Google validation with google-auth-library
3. test(api): update google login tests for google-auth

## Status

[ ] Non iniziata
