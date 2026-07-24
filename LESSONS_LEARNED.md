# Lessons Learned

> **Scopo:** Documentare le lezioni apprese durante lo sviluppo, problemi architetturali emersi, e regole per evitare che si ripetano.
> **Aggiornato:** 2026-07-24

---

## Quality assurance — i test devono copiare il flusso reale

> **Lezione appresa (2026-07-13):**

4 bug critici sono arrivati in produzione nonostante 256 test passassero. Causa: i test mockavano/bypassavano il comportamento reale invece di testarlo.

**Regole per test futuri:**

1. Il flusso cookie-based deve essere testato con cookie, non con Bearer header
2. CSRF/rate limiting non possono essere semplicemente disabilitati — vanno testati separatamente
3. I mock di librerie esterne (jwt.decode, Google certs) vanno verificati contro il comportamento reale
4. Ogni nuova feature deve includere test che simulano lo scenario di produzione (dominio diverso, cookie cross-origin, ecc.)
5. `TestClient` ha limitazioni intrinseche (stesso-origin) — i test E2E con Playwright sono necessari per la vera validazione cross-origin

---

## Migrazioni infrastrutturali

### 2026-07-21 — Schema DB incompleto dopo migrazione Neon

**Problema:** L'import dei dati da Render PostgreSQL a Neon ha copiato i dati ma non lo schema completo. La colonna `bug_reports.report_count` era definita solo nel modello Python, non in una migrazione Alembic. Su Render funzionava perché il database era stato modificato manualmente. Su Neon, tutte le operazioni che accedevano a `bug_reports` fallivano con `UndefinedColumn`, causando una cascata di errori (Google SSO, upload, admin bug report, ecc.).

**Rimedio:** Creata migrazione Alembic `6b1f5a3e8c9d` per aggiungere `report_count` a `bug_reports`.

**Regola per il futuro:** Ogni colonna nel modello DEVE avere una migrazione Alembic corrispondente. `_add_missing_columns()` in `main.py` è un workaround, non una soluzione — le migrazioni sono l'unico source of truth per lo schema.

---

### 2026-07-21 — Google SSO usava HTTPException raw invece di error_response

**Problema:** Il `google_login()` in `auth.py` usava `HTTPException(status_code=401, detail=str(e))` invece di `error_response(ErrorCode.GOOGLE_AUTH_FAILED, ...)`. Il frontend non trovava un codice mappabile e mostrava `common.unknownError` invece di `auth.googleAuthFailed`.

**Rimedio:** Sostituita raw HTTPException con `error_response()` nel google_login handler (PR #373, issue #372).

**Regola per il futuro:** Ogni endpoint DEVE usare `error_response()` con un codice `ErrorCode` stabile — mai `HTTPException` raw.

---

### 2026-07-21 — Upload cross-origin blocca senza handshake CSRF iniziale

**Problema:** Il middleware `CSRFMiddleware` imposta il cookie `csrf_token` solo dopo una richiesta "safe" (GET/HEAD/OPTIONS). Se l'utente esegue il primo POST (upload) subito dopo il login, la richiesta viene respinta con `403` e il browser la segnala come errore CORS perché gli header sono generati prima del middleware CORS.

**Fix 1 (hotfix #376):** Il cookie `csrf_token` viene ora emesso contestualmente al login/register/google tramite `set_csrf_cookie(response)` in `auth.py`. Il frontend non necessita più di una GET preliminare — il primo POST dopo login funziona immediatamente.

**Fix 2 (hotfix #381):** Il `csrf_token` viene ora restituito anche nel **body della risposta** di login/register/google (campo `csrf_token` in `TokenResponse`). Il frontend lo memorizza in memoria nell'`ApiClient` perché `document.cookie` non è leggibile cross-origin (dominio API ≠ dominio frontend).

**Regola per il futuro:** Ogni flusso cross-origin che usa CSRF double-submit pattern deve prevedere un meccanismo per trasmettere il token al frontend via body della risposta, non solo via cookie.

---

### 2026-07-21 — Ordine middleware CSRF/CORS in Starlette

**Problema:** In Starlette, l'**ultimo** middleware registrato con `add_middleware()` è il **più esterno** (quello che avvolge tutti gli altri). Se CSRFMiddleware è registrato dopo CORSMiddleware, le risposte 403 del CSRF bypassano il CORS e il browser le vede come errori CORS.

**Fix (PR #380):** CORSMiddleware ora è l'ultimo middleware registrato (outermost), CSRFMiddleware è registrato prima (inner). La risposta 403 del CSRF risale attraverso CORSMiddleware che aggiunge `Access-Control-Allow-Origin`.

**Regola per il futuro:** `add_middleware(CORSMiddleware)` deve essere SEMPRE l'ultimo middleware registrato nell'app FastAPI, per intercettare tutte le risposte (inclusi errori da middleware interni).

---

## Security audit

### 2026-07-15 — I bug vanno cercati nel codice, non aspettare che emergano in produzione

L'audit manuale del 2026-07-15 ha trovato 21 bug + 10 miglioramenti, tutti fixati con PR e CI. La lezione è che il testing automatizzato da solo non basta — serve revisione attiva del codice.

### 2026-07-09 — Security audit completato

20/24 issue risolte (83%). Tutte le vulnerabilità critiche e alte sono state corrette. Vedi [`CHANGELOG.md`](./CHANGELOG.md) per l'elenco completo.

---

## Note tecniche

- Il warning `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated; install httpx2 instead` non è fixabile — `httpx2` non esiste ancora.
