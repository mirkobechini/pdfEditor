# Hotfix: CSRF token cross-origin — restituire csrf_token nel body delle risposte auth

## Problema

Il cookie `csrf_token` è impostato dall'API sul dominio `pdfeditor-api.mirkobechini.com`. Il frontend su `pdfeditor.mirkobechini.com` (cross-origin) non può leggere `document.cookie` per estrarlo, quindi `_getCsrfToken()` restituisce `null` e l'header `X-CSRF-Token` non viene inviato. Il server vede cookie presente ma header assente → 403 Forbidden.

## Impatto

- Ogni utente che prova a caricare un PDF in produzione (cross-origin) ottiene 403.
- Il bug è invisibile in sviluppo locale (same-origin: `localhost:3000` su `localhost:8000`).

## Obiettivo del fix

- Restituire `csrf_token` nel **body della risposta** di login/register/google in modo che il frontend possa usarlo anche cross-origin.

## Piano tecnico

1. **TokenResponse schema** — Aggiungere campo `csrf_token: str | None = None`
2. **Auth endpoints** — Generare token con `generate_csrf_token()`, passarlo sia nel body che nel cookie
3. **ApiClient frontend** — Memorizzare `csrf_token` in memoria (con `setCsrfToken()`), dargli priorità su cookie
4. **Test** — Verificare presenza e validità di `csrf_token` nel body + test frontend su priorità memoria vs cookie

## Status

[x] Completata — 2026-07-21

### Commit

1. `feat(api): add csrf_token field to TokenResponse schema`
2. `feat(api): return csrf_token in login/register/google response body`
3. `feat(ui): store csrf_token in ApiClient memory for cross-origin`
4. `test(api): verify csrf_token in auth response body + frontend memory test`

### Note

- Il cookie `csrf_token` viene comunque impostato (per backward compat e same-origin). Il frontend usa memoria prima, cookie come fallback.
- `_getCsrfToken()` ora controlla `this._csrfToken` (memoria) prima di `document.cookie`.
