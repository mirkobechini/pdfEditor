# Bug: Login email/password 401 su Neon (K1)

## Obiettivo

Diagnosticare e risolvere il login 401 quando si usa email/password su Neon (cloud). Il desktop chiama `cloudApi.login()` ma riceve 401.

## Contesto

- **KNOWN_ISSUES.md K1**: Login con email/password non funziona su Neon (401)
- Il backend differenzia già `EMAIL_NOT_FOUND` vs `WRONG_PASSWORD` (backend `auth.py` linee 129-132)
- Possibili cause: utente non registrato su Neon, o SECRET_KEY del cloud diversa da quella del sidecar

## Verifica

1. Controllare che il backend Render sia attivo
2. Verificare che l'utente sia registrato su Neon (PostgreSQL)
3. Testare login con utente admin via API diretta (`POST /auth/login`)
4. Verificare che il messaggio di errore sia differenziato (EMAIL_NOT_FOUND vs WRONG_PASSWORD)

## Risoluzione

- Se utente non registrato: guidare l'utente alla registrazione prima del login
- Se SECRET_KEY diversa: allineare le chiavi tra cloud e sidecar
- Se errore generico: migliorare il messaggio per l'utente

## Output atteso

- Login email/password funzionante su Neon
- Messaggio di errore chiaro se l'utente non è registrato

## Status

[ ] Non iniziata
