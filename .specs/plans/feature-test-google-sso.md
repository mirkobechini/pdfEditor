# Feature: Google SSO Login Tests

**Issue Number**: issue-142

## Obiettivo

Aggiungere test per il flusso di login con Google SSO. Attualmente ci sono solo test per token invalido/vuoto, ma manca il test per il flusso **success** (con token mockato).

## Problema

- `test_auth.py` ha `TestGoogleSSO` con 2 test (invalid token, empty token)
- ❌ Nessun test per login Google **riuscito**
- ❌ Nessun test per **creazione nuovo utente** via Google SSO
- ❌ Nessun test per **utente esistente** che fa login con Google

## Dipendenze

- `backend/tests/test_auth.py` — Aggiungere test a `TestGoogleSSO`
- `backend/app/services/auth_service.py` — `google_login()` method
- `conftest.py` — fixtures esistenti (client, free_headers, etc.)

## Stack

- Backend: FastAPI + pytest
- Mock: `unittest.mock.patch` per `requests.get` (Google certs endpoint)

## Output atteso

✅ Test aggiunti in `TestGoogleSSO`:

1. **test_google_login_new_user** — Token Google valido → nuovo utente creato → JWT restituito
2. **test_google_login_existing_user** — Token Google valido → utente esistente → JWT restituito
3. **test_google_login_inactive_user** — Token Google valido → utente disattivato → 401

## Accettazione Criteria

- [ ] Mock di `requests.get` per restituire chiavi Google fake
- [ ] Mock di `jose.jwt.decode` per restituire payload controllato
- [ ] Test nuovo utente: verifica che user viene creato in DB
- [ ] Test utente esistente: verifica che non viene duplicato
- [ ] Test utente inattivo: verifica 401
- [ ] Tutti i test passano: `pytest backend/tests/test_auth.py::TestGoogleSSO -v`

## Status

- [ ] Non iniziata
- [ ] In progress
- [ ] In review
- [ ] Completata

## Timeline

Stimato: 1 ora

## Note

- Usare `unittest.mock.patch("requests.get")` per mockare Google certs
- Usare `unittest.mock.patch("jose.jwt.decode")` per mockare token verification
- Il payload mockato deve contenere `email`, `name`, `sub` (Google ID)
- Non chiamare API Google reali nei test
