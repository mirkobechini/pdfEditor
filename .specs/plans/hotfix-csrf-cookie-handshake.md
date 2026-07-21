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

---

## Status

[x] Completata — 2026-07-21

### Commit

1. `feat(core): add generate_csrf_token and set_csrf_cookie helpers`
2. `feat(api): set csrf_token cookie on login/register/google`
3. `test(api): verify csrf_token cookie on auth endpoints + regression test`
4. `docs: update ADR with csrf cookie handshake fix outcome`
5. `fix(ui): ignore harmless 'Node cannot be found' error from PDF.js`
6. `fix(api): fix CSRF/CORS middleware order — CORSMiddleware outermost`

### Note

- Durante il fix è emerso un secondo problema: il middleware CSRF era registrato **dopo** CORSMiddleware, causando falsi errori CORS quando CSRF rispondeva 403. Risolto invertendo l'ordine (CORSMiddleware outer, CSRFMiddleware inner) e rimuovendo una registrazione duplicata.
- L'errore "Node cannot be found" è un falso positivo di PDF.js quando il canvas viene rimosso dal DOM durante il rendering. Silenziato con controllo esplicito (`isConnected`).
