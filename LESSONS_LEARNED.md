# Lessons Learned

> **Scopo:** Documentare le lezioni apprese durante lo sviluppo, problemi architetturali emersi, e regole per evitare che si ripetano.
> **Aggiornato:** 2026-08-03

---

## Ghost PDF — rimuovere dal DB, non solo dalla UI

> **Lezione appresa (2026-08-03):**

I record orfani nel DB (PDF senza file fisico su disco) non devono essere solo nascosti dalla UI. Se non li cancelli dal DB, al prossimo riavvio la lista `listPdfs` li restituisce di nuovo e il problema si ripresenta.

**Soluzione:** Dopo aver constatato il 404 con HEAD request, chiamare `api.deletePdf(id)` per rimuovere definitivamente il record.

**Regola:** "Rimuovere" dalla lista non basta — bisogna eliminare il record dal database.

---

## Sidecar cleanup — taskkill da solo non basta

> **Lezione appresa (2026-08-01):**

Chiamare `taskkill /F /IM fastapi-sidecar.exe` NON è sufficiente per terminare il sidecar definitivamente. Dopo il kill, Windows può riavviare il processo in assenza di un cleanup completo del process group.

**Soluzione:** Triplice kill: 1) `CommandChild.kill()` via handle Tauri nativo, 2) `taskkill /F /IM fastapi-sidecar*` (wildcard per target triple suffix), 3) `std::process::exit(0)` per uscita immediata del processo senza cleanup Tauri che possa riavviare orfani.

**Regola:** Quando si termina un sidecar Tauri, non affidarsi solo a comandi esterni (taskkill). Usare SEMPRE il `CommandChild` handle restituito da `.spawn()` per kill pulito, combinato con exit forzato.

---

## Tauri IPC senza npm modules — withGlobalTauri

> **Lezione appresa (2026-08-01):**

`tauriInvoke("plugin:opener|open_url")` non funziona in produzione perché il comando IPC non è direttamente accessibile via `__TAURI_INTERNALS__`. La soluzione corretta è abilitare `withGlobalTauri: true` in `tauri.conf.json`, che rende `window.__TAURI__` disponibile con tutti i plugin (opener, dialog, ecc.) senza bisogno di moduli npm.

**Comandi disponibili con withGlobalTauri:**

- `window.__TAURI__.opener.openUrl(url)` — apre URL nel browser di sistema
- `window.__TAURI__.dialog.open(options)` — dialog nativo per file/cartelle

**Regola:** Per qualsiasi API Tauri nel frontend, abilitare `withGlobalTauri: true` e usare `window.__TAURI__.*` invece di importare pacchetti npm che non vengono inclusi nello static export di Next.js.

---

## CORS in produzione Tauri — tauri.localhost vs tauri://localhost

> **Lezione appresa (2026-08-01):**

La webview Tauri in produzione usa `http://tauri.localhost` come origin, NON `https://tauri.localhost` (con 's').
Mancava in `ALLOWED_ORIGINS`, causando CORS error su tutte le fetch. Il dev mode funzionava perché l'origin era `http://localhost:3000`.

**Regola:** Quando si configura CORS per Tauri, aggiungere SEMPRE tutti e tre: `tauri://localhost`, `http://tauri.localhost`, `https://tauri.localhost`.

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

### 2026-08-02 — Sync user non basta per CSRF sidecar

**Problema:** `api.syncUser(u)` salva l'utente in SQLite locale ed emette un JWT locale, ma il frontend continua a usare il token JWT della cloud (con SECRET_KEY diversa) per chiamare il sidecar. Il sidecar non riconosce il token e `getMe()`/`refreshCsrf()` falliscono.

**Lezione:** Non basta sincronizzare l'utente — bisogna anche **sostituire il token JWT** nel client con quello locale emesso dal sidecar. `syncUser()` restituisce già `access_token` e `csrf_token`, ma il frontend non li usa per aggiornare `api.setToken()`/`api.setCsrfToken()`.

**Regola:** Dopo aver chiamato un endpoint che restituisce un nuovo JWT, aggiornare SEMPRE il client locale con `api.setToken(newToken)` prima di chiamare altre API sul sidecar.

### 2026-08-02 — SameSite cookie su connessione cross-site Tauri

**Problema:** Il cookie CSRF non veniva inviato sulle POST cross-site in ambiente Tauri. La webview Tauri ha origin `http://tauri.localhost`, mentre il sidecar ascolta su `http://127.0.0.1:7723` — due origini diverse. Con `SameSite=Lax`, il browser non invia il cookie su richieste POST cross-site.

**Soluzione:** Rilevare se la connessione è su localhost (127.0.0.1, localhost, ::1) e in quel caso usare `SameSite=None, Secure=False`. Chrome/Edge permettono `SameSite=None` senza `Secure` su localhost.

**Regola:** In ambiente Tauri, dove webview origin ≠ sidecar origin, i cookie devono usare `SameSite=None` anche su HTTP (localhost). Non assumere mai che localhost = same-site.

### 2026-07-26 — I file .env pubblici su GitHub non devono contenere secret

**Problema:** `desktop/.env.desktop` conteneva `SECRET_KEY`, `JWT_SECRET_KEY` e `SUPER_ADMIN_EMAIL` hardcoded e pubblici su GitHub. Anche se il backend desktop ascolta solo su localhost, è cattiva pratica.

**Rimedio:** Rimosse tutte le chiavi hardcoded da `.env.desktop`. Aggiunta auto-generazione di `SECRET_KEY` in `config.py` se vuota (PR #446).

**Regola per il futuro:** I file `.env` pubblici non devono mai contenere secret. Se un valore è opzionale (auto-generabile), lascialo vuoto. Se è obbligatorio, documentalo in `.env.example` ma non nel file bundlato.

### 2026-07-27 — La versione dell'app va aggiornata in 3 file prima di ogni release

**Problema:** `tauri.conf.json`, `package.json` e `pyproject.toml` avevano tutti `version = "0.1.0"` nonostante i tag `v0.1.1`, `v0.1.2`, `v0.1.3`. L'installer desktop mostrava ancora "0.1.0" internamente.

**Rimedio:** Aggiornati tutti e 3 i file manualmente.

**Regola per il futuro:** Prima di creare un tag release, aggiornare SEMPRE `tauri.conf.json`, `package.json` e `pyproject.toml` con la nuova versione. Il `release.yml` dovrebbe idealmente automatizzare questo passaggio leggendo il nome del tag.

### 2026-07-27 — La CI non faceva build check, bug di compilazione in produzione

**Problema:** La frontend CI eseguiva solo `vitest run` ma non `npm run build`. Un import mancante (`useAuth` in `page.tsx`) non veniva rilevato — i test passavano ma la build falliva su Render e nella release desktop.

**Rimedio:** Aggiunto step `npm run build` in `test.yml` dopo i test frontend.

**Regola per il futuro:** La CI frontend DEVE includere un build check (`npm run build` o `tsc --noEmit`) oltre ai test. I test unitari non verificano la compilazione.

### 2026-07-27 — Parametri invalidi a librerie di terze parti non rilevati dai test

**Problema:** `GoogleLoginButton` usava `width="100%"` che la Google Identity Services library non supporta. Il parametro invalido causava l'errore `Provided button width is invalid` e un crash a catena. Nei test il componente era mockato — l'errore non emergeva.

**Rimedio:** Rimosso `width="100%"`, sostituito con wrapper CSS.

**Regola per il futuro:** I parametri delle librerie esterne (Google, Stripe, ecc.) vanno verificati sulla documentazione ufficiale, non dati per scontati. Aggiungere un test che verifichi i parametri passati anche quando il componente è mockato.
