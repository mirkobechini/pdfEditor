# Known Issues & Technical Debt

> **Scopo:** Tracciare bug minori, debito tecnico e miglioramenti che non hanno rilevanza architetturale (non vanno in `ADR.md`).  
> -> **Aggiornato:** 2026-07-28
> +> **Aggiornato:** 2026-07-28

---

## 🔴 Bug aperti

-> ⚠️ **Nessun bug aperto al momento.**
+### B1 — Sidecar offline non funziona (desktop)

- +**File:** `desktop/run_backend.py`, `desktop/src-tauri/src/lib.rs`, `.github/workflows/release.yml`  
  +**Descrizione:** Il sidecar FastAPI non viene buildato correttamente nella CI di release, quindi il desktop non ha backend locale. Il login fallisce con `common.networkError` perché la chiamata a `http://127.0.0.1:7723` non trova nulla. +**Piano:** `.specs/plans/bug-login-network-error-desktop.md`
- +### B2 — Wrapper layout login (desktop)
- +**File:** `desktop/frontend/src/app/login/page.tsx`  
  +**Descrizione:** La login page ha un contenitore esterno (`max-w-6xl`, `py-20`, `rounded-2xl`, `shadow-2xl`) che non è presente nello screenshot Lovable. Causa scrollbar indesiderata e aspetto "incorniciato".
- +### B4 — Errore Google login persiste dopo login email/password (desktop)
- +**File:** `desktop/frontend/src/components/GoogleLoginButton.tsx`, `desktop/frontend/src/app/login/page.tsx`  
  +**Descrizione:** L'errore di Google rimane visibile anche dopo aver fatto login con email/password. Non viene resettato al submit del form.
  ***
  ## 🟡 Bug minori
  +### B3 — Password toggle duplicato (desktop)
- +**File:** `desktop/frontend/src/components/PasswordInput.tsx`  
  +**Descrizione:** Il componente ha già il pulsante Mostra/Nascondi, ma Chrome aggiunge il suo nativo. Ne risultano due toggle. +**Piano:** `.specs/plans/bug-double-password-toggle.md`
- +### B5 — Traduzione `networkError` mancante (desktop)
- +**File:** `desktop/frontend/messages/en.json`, `desktop/frontend/messages/it.json`  
  +**Descrizione:** `mapError` restituisce `common.networkError` ma le traduzioni IT/EN non hanno quella chiave. +**Piano:** `.specs/plans/bug-login-network-error-desktop.md`
- **Descrizione:** L'endpoint `POST /pdfs/{id}/replace-text` accetta `search + replace + occurrence` ma il risultato non è affidabile. PyMuPDF text search ha limitazioni con PDF complessi (font embedded, ligature, spaziature variabili).  
  **Risoluzione prevista:** Sostituire con inline text editor (`.specs/plans/feature-inline-text-editor.md`).

  ***

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
