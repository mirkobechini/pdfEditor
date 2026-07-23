# Known Issues & Technical Debt

> **Scopo:** Tracciare bug minori, debito tecnico e miglioramenti che non hanno rilevanza architetturale (non vanno in `ADR.md`).  
> **Aggiornato:** 2026-07-23

---

## 🔴 Bug aperti

### B1 — Landing page 401 loop (AuthProvider)

**Issue:** #385  
**File:** `frontend/src/app/lib/auth.tsx`  
**Piano:** `.specs/plans/hotfix-401-loop-landing-page.md`  
**Descrizione:** `AuthProvider` chiama `getMe()` all'mount; se il componente si smonta/rimonta (StrictMode, Suspense), entra in loop infinito di 401.  
**Fix:** Aggiungere guard `_hasChecked` persistente fuori dal ciclo React (modulo globale o sessionStorage).

---

## 🟡 Bug minori

### B2 — Find & Replace non funziona

**File:** `backend/app/api/v1/text.py`  
**Segnalato in:** ADR (#19)  
**Descrizione:** L'endpoint `POST /pdfs/{id}/replace-text` accetta `search + replace + occurrence` ma il risultato non è affidabile. PyMuPDF text search ha limitazioni con PDF complessi (font embedded, ligature, spaziature variabili).  
**Risoluzione prevista:** Sostituire con inline text editor (`.specs/plans/feature-inline-text-editor.md`).

### B3 — i18n: provider custom + next-intl coesistono

**File:** `frontend/src/app/lib/i18n.tsx`  
**Descrizione:** `next-intl` è installato in `package.json` e usato via `NextIntlClientProvider`, ma è avvolto da un `I18nProvider` custom con `LocaleCtx` e `useLocaleControl()`. Rischio che parti dell'UI usino un sistema e altre l'altro, con traduzioni non sincronizzate.  
**Risoluzione prevista:** Unificare sotto `next-intl` puro, rimuovendo il provider custom.

### B4 — Rate limiting su upload: falsi positivi

**File:** `backend/app/main.py` (slowapi config)  
**Descrizione:** Il rate limiter è configurato su IP (5/minuto per login, etc.). Upload di file grandi (es. 49MB) richiede secondi, durante i quali altre richieste dello stesso IP potrebbero far scattare il limite.  
**Risoluzione prevista:** Escludere l'endpoint `/pdfs/upload` dal rate limiter globale, o usare un limite separato più alto.

### B5 — Export endpoint accetta formati non validi

**File:** `backend/app/api/v1/convert.py`  
**Descrizione:** `POST /pdfs/{pdf_id}/export` accetta un parametro `format` come stringa libera. Se l'utente passa un formato non supportato (es. `"gif"`), PyMuPDF potrebbe crashare con errore poco chiaro.  
**Risoluzione prevista:** Aggiungere validazione Pydantic con enum dei formati supportati (`txt`, `png`, `jpg`, `svg`).

### B6 — Content-Disposition: possibile XSS via filename

**File:** `backend/app/core/security.py`  
**Descrizione:** Il `Content-Disposition` header per il download usa `original_filename` fornito dall'utente. Parzialmente sanitizzato in PR #208, ma non c'è test esplicito per caratteri pericolosi (`;`, `\n`, `"`).  
**Risoluzione prevista:** Aggiungere sanitizzazione rigorosa e test di sicurezza.

---

## 🔵 Debito tecnico

### T1 — `_password_cache` module-global non scala

**File:** `backend/app/services/pdf_service.py`  
**Segnalato in:** ADR (#2)  
**Descrizione:** Variabile `_password_cache` è module-global. Con multi-worker (gunicorn), ogni worker ha la sua copia. Password salvata in un worker non è disponibile in un altro.  
**Risoluzione prevista:** Redis o DB in Fase 2 ✅ (B18: cleanup su shutdown già implementato).

### T2 — Zero test E2E / integration

**Segnalato in:** ADR (#14)  
**Descrizione:** 331 test backend (con `TestClient` same-origin) + 348 test frontend (jsdom). Nessun test E2E che copra flussi cross-origin reali (cookie, CSRF, CORS).  
**Risoluzione prevista:** Playwright (T7).

### T3 — Expired token cleanup non implementato

**Piano:** `.specs/plans/chore-expired-token-cleanup.md`  
**Descrizione:** I reset token scaduti rimangono in DB per sempre. Serve cleanup lazy: quando un utente richiede un nuovo reset, pulire i token scaduti prima di generare il nuovo.

### T4 — Admin email non configurabile via env

**Piano:** `.specs/plans/chore-admin-email-env.md`  
**Descrizione:** `SUPER_ADMIN_EMAIL` è hardcodato in `config.py` con default `"admin@pdfeditor.local"`. In produzione viene validato all'avvio, ma in sviluppo rimane il default.

### T5 — Dark mode: prima visita su pagine non protette

**File:** `frontend/src/app/layout.tsx`  
**Descrizione:** Il `Script` di dark mode (beforeInteractive) controlla localStorage + `prefers-color-scheme`. Funziona su tutte le pagine, ma le pagine landing/legal hanno un layout diverso e potrebbero non ereditare correttamente la classe `dark` in alcuni edge case.

---

## 📊 Coverage gaps (non bloccanti)

| Area                         | Coverage         | Bloccante? | Note                                            |
| ---------------------------- | ---------------- | ---------- | ----------------------------------------------- |
| Backend totale               | 97% (331 test)   | ❌ No      | Limite pratico raggiunto senza integration test |
| Frontend totale              | 75.9% (348 test) | ❌ No      | 80%+ solo con Playwright E2E                    |
| Admin page                   | 67%              | ❌ No      | API calls non testate                           |
| Editor page                  | 69%              | ❌ No      | handleSplit/handleReorder/... non testati       |
| Reorder/Split/Remove dialogs | 34-44%           | ❌ No      | Richiedono rendering PDF.js (canvas) in jsdom   |

---

## 🧪 Dipendenze con warning

| Pacchetto                        | Versione       | Warning                       | Impatto                                                       |
| -------------------------------- | -------------- | ----------------------------- | ------------------------------------------------------------- |
| `httpx` + `starlette.testclient` | —              | `StarletteDeprecationWarning` | Nessuno — `httpx2` non esiste ancora                          |
| `sharp`                          | < 0.35.0       | CVE (High)                    | Dipendenza interna Next.js 16.2.11, in attesa di fix upstream |
| `brace-expansion`                | 1.1.16 / 5.0.8 | CVE-2026-13149 (High)         | DevDependency (eslint)                                        |
| `postcss`                        | < 8.5.10       | CVE-2026-41305 (Medium)       | DevDependency via Next.js, non raggiungibile in produzione    |

---

## 📝 Note operative

- I bug contrassegnati con **piano** hanno un file `.specs/plans/` corrispondente con dettagli e implementazione step-by-step.
- I bug senza piano sono piccoli fix che possono essere risolti al volo durante lo sviluppo di altre feature.
- Questo file va aggiornato quando un bug viene fixato o quando se ne scopre uno nuovo.
