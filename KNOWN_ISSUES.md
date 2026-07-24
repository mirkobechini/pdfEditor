# Known Issues & Technical Debt

> **Scopo:** Tracciare bug minori, debito tecnico e miglioramenti che non hanno rilevanza architetturale (non vanno in `ADR.md`).  
> **Aggiornato:** 2026-07-23

---

## 🔴 Bug aperti

> ⚠️ **Nessun bug aperto al momento.**

---

## 🟡 Bug minori

### B2 — Find & Replace non funziona

**File:** `backend/app/api/v1/text.py`  
**Segnalato in:** ADR (#19)  
**Descrizione:** L'endpoint `POST /pdfs/{id}/replace-text` accetta `search + replace + occurrence` ma il risultato non è affidabile. PyMuPDF text search ha limitazioni con PDF complessi (font embedded, ligature, spaziature variabili).  
**Risoluzione prevista:** Sostituire con inline text editor (`.specs/plans/feature-inline-text-editor.md`).

### B3 — i18n: provider custom + next-intl coesistono ✅ **Risolto**

**File:** `frontend/src/app/lib/i18n.tsx`  
**Risoluzione:** Sostituito `useLocaleControl()`/`LocaleCtx` con `useLocale()` (next-intl) + `useLocaleSetter()` minimale. PR #401.

### B6 — Content-Disposition: possibile XSS via filename ✅ **Risolto**

**File:** `backend/app/core/sanitize.py`  
**Risoluzione:** Rafforzata `sanitize_filename()` con allowlist ASCII sicura. PR #399.

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

### T3 — Expired token cleanup ✅ **Risolto**

**Piano:** `.specs/plans/chore-expired-token-cleanup.md`  
**Stato:** Già implementato in `UserRepository.delete_expired_tokens()` + chiamato da `AuthService.request_password_reset()`. PR #139.

### T4 — Admin email non configurabile via env ✅ **Risolto**

**Descrizione:** `SUPER_ADMIN_EMAIL` è già leggibile da `.env` tramite Pydantic Settings. Il default in `config.py` è `"admin@pdfeditor.local"`.

### T5 — Dark mode: prima visita su pagine non protette ✅ **Risolto**

**Descrizione:** Lo script `beforeInteractive` in `layout.tsx` esegue su tutte le pagine prima che React idrati. Funziona ovunque.

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
