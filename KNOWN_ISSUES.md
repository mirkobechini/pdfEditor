# Known Issues & Technical Debt

> **Scopo:** Tracciare bug minori, debito tecnico e miglioramenti che non hanno rilevanza architetturale (non vanno in `ADR.md`).  
> **Aggiornato:** 2026-07-28

---

## 🔴 Bug aperti

### B6 — Sidecar PyInstaller non funziona all'avvio (desktop v0.1.13)

**File:** `desktop/build-sidecar.sh`, `.github/workflows/release.yml`, `desktop/run_backend.py`  
**Descrizione:** L'app desktop si installa ma il backend FastAPI (sidecar PyInstaller) non parte. L'health check fallisce sempre e l'app resta in "Loading...".
**Piano:** `.specs/plans/bug-sidecar-pyinstaller-rotto.md`

---

## 🟡 Bug minori

### B2 — Find & Replace non funziona

**File:** `backend/app/api/v1/text.py`  
**Descrizione:** L'endpoint `POST /pdfs/{id}/replace-text` accetta `search + replace + occurrence` ma il risultato non è affidabile. PyMuPDF text search ha limitazioni con PDF complessi (font embedded, ligature, spaziature variabili).  
**Risoluzione prevista:** Sostituire con inline text editor (`.specs/plans/feature-inline-text-editor.md`).

---

## 🔵 Debito tecnico

### T1 — `_password_cache` module-global non scala

**File:** `backend/app/services/pdf_service.py`  
**Descrizione:** Variabile `_password_cache` è module-global. Con multi-worker (gunicorn), ogni worker ha la sua copia.  
**Risoluzione prevista:** Redis o DB centralizzato.

### T2 — Zero test E2E / integration

**Descrizione:** 342 test backend (con `TestClient` same-origin) + 373 test frontend (jsdom). Nessun test E2E che copra flussi cross-origin reali (cookie, CSRF, CORS). Aggiunti 21 test per utility Tauri e componenti overlay.  
**Risoluzione prevista:** Playwright (T7).

---

## 📊 Coverage gaps (non bloccanti)

| Area                         | Coverage         | Bloccante? | Note                                          |
| ---------------------------- | ---------------- | ---------- | --------------------------------------------- |
| Backend totale               | 94% (359 test)   | ❌ No      | 1 pre-existing fail (test_seed_super_admin)   |
| Frontend totale              | ~75% (363+ test) | ❌ No      | 22 test login + auth remember-me aggiunti     |
| Admin page                   | 67%              | ❌ No      | API calls non testate                         |
| Editor page                  | 69%              | ❌ No      | handleSplit/handleReorder/... non testati     |
| Reorder/Split/Remove dialogs | 34-44%           | ❌ No      | Richiedono rendering PDF.js (canvas) in jsdom |

---

## 🧪 Dipendenze con warning (Dependabot)

| #      | Pacchetto                        | Severità  | Versione             | Stato                           | Note                                                                                                                         |
| ------ | -------------------------------- | --------- | -------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **34** | `postcss` (path traversal)       | 🔴 high   | 8.4.31 (via Next.js) | ⛔ **Non fixabile**             | Sub-dipendenza interna di `next@16.2.11`. In attesa che Next.js aggiorni il suo sub-dep.                                     |
| **33** | `postcss` (arbitrary file read)  | 🔴 high   | 8.4.31 (via Next.js) | ⛔ **Non fixabile**             | Stesso di #34.                                                                                                               |
| **22** | `sharp` / libvips                | 🔴 high   | < 0.35.0             | ⛔ **Non fixabile**             | Sub-dipendenza interna Next.js 16.2.11. `sharp@0.35.0` esiste ma Next non lo richiede ancora.                                |
| **32** | `glib::VariantStrIter`           | 🟡 medium | < 0.20.0 (Rust)      | ⏳ **Fixabile ma sconsigliato** | Dipendenza indiretta di Tauri. Forzare `glib 0.20.0` rischia di rompere `cargo tauri build`. CVE non esposto a input utente. |
| —      | `httpx` + `starlette.testclient` | —         | —                    | ⛔ **Non fixabile**             | `StarletteDeprecationWarning` — `httpx2` non esiste ancora.                                                                  |
| —      | `brace-expansion`                | 🔴 high   | 1.1.16 / 5.0.8       | ✅ **Falso positivo**           | DevDependency di eslint, non raggiungibile in produzione. Auto-dismissed da Dependabot.                                      |

### Vulnerabilità risolte (non più segnalate da Dependabot)

| Pacchetto          | Fix                             |
| ------------------ | ------------------------------- |
| `js-yaml`          | PR #392 (bump 4.2.0 → 4.3.0)    |
| `next`             | PR #393 (bump 16.2.9 → 16.2.11) |
| `python-multipart` | PR #395 (bump 0.0.31 → 0.0.32)  |
| `PyJWT`            | Già a 2.13.0 (fixato)           |
| `python-jose`      | Rimosso (non in uso)            |

---

## 📝 Note operative

- I bug contrassegnati con **piano** hanno un file `.specs/plans/` corrispondente con dettagli e implementazione step-by-step.
- Questo file va aggiornato quando un bug viene fixato o quando se ne scopre uno nuovo.
- I fix risolti vanno spostati in `CHANGELOG.md`.
- Le **lezioni apprese** (QA, migrazioni, CSRF/CORS, security audit) sono in [`LESSONS_LEARNED.md`](./LESSONS_LEARNED.md).
