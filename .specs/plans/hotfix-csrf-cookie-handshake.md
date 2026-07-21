# Hotfix: CSRF cookie handshake post login

## Problema

Gli endpoint di upload (e qualsiasi POST cross-origin) richiedono un cookie `csrf_token` impostato dal middleware `CSRFMiddleware`. Il token viene emesso solo dopo la prima richiesta "safe" (GET/HEAD/OPTIONS). Subito dopo il login il frontend esegue un POST `/pdfs/upload` senza aver prima effettuato una GET, il middleware risponde con 403 (`CSRF validation failed`) e il browser mostra un errore CORS.

## Impatto

- Ogni nuovo utente che prova a caricare un PDF immediatamente dopo il login ottiene un 403.
- L'errore è fuorviante (messaggio di CORS) e non è evidente come risolverlo lato frontend.

## Obiettivo del fix

- Garantire che il cookie `csrf_token` venga emesso contestualmente al login/register in modo che il primo POST successivo non fallisca.

## Piano tecnico

1. **Estendere CSRFMiddleware**
   - Aggiungere helper `generate_csrf_token()` e `set_csrf_cookie(response, token=None)` in `app/core/csrf.py` per poter riutilizzare la logica di emissione cookie.

2. **Aggiornare auth endpoints**
   - In `app/api/v1/auth.py`, dopo `_set_token_cookie`, richiamare `set_csrf_cookie(response)` per `/auth/login`, `/auth/register`, `/auth/google`.
   - (Opzionale) rimuovere duplicazione se l'helper è riutilizzato altrove.

3. **Test**
   - Aggiornare test backend in `tests/test_auth.py` per verificare presenza cookie `csrf_token` su login/register.
   - Aggiungere test di regressione per upload: simulare POST `/pdfs/upload` subito dopo login usando TestClient con CSRF abilitato (richiede rimuovere fixture `disable_csrf` nel test specifico).

4. **Documentazione**
   - Aggiornare ADR (Lezioni apprese) con nuovo comportamento.

## Check dopo fix

- Login → POST `/pdfs/upload` senza GET intermedia funziona (200/201).
- I test pytest passano con CSRF abilitato per il caso destinato.
- Nessuna regressione sui flussi esistenti.
