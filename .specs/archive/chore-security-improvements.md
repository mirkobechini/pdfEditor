# Chore: Security Improvements for Render Production

**Status:** ✅ Completata (2026-07-09)
**Complexity:** Medium
**Estimated Time:** 4-6 ore (totale)

## Obiettivo

Implementare tutti i fix di sicurezza rimanenti prima della messa in produzione pubblica su Render.

---

## Task 1: Graceful Shutdown (SIGTERM Handler)

**Tempo:** 1-2 ore
**Priority:** ALTA (Render manda SIGTERM a ogni deploy)

### Problema

Render manda SIGTERM a ogni deploy/restart. Se un PDF è aperto con PyMuPDF in quel momento, i file handle non vengono chiusi, rischiando corruzione.

### Soluzione

```python
# backend/app/main.py
import signal
import atexit

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown — close all PyMuPDF handles."""
    PdfService.cleanup_all()
```

Aggiungere `cleanup_all()` a `pdf_service.py` che tiene traccia dei documenti aperti.

---

## Task 2: Password Strength Validation

**Tempo:** 1 ora
**Priority:** MEDIA (Security quick win)

### Problema

Backend non valida la forza della password oltre la lunghezza minima. Password di 1 carattere (se frontend bypassato) viene accettata.

### Soluzione

```python
# backend/app/services/auth_service.py
import re

def _validate_password_strength(password: str):
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain an uppercase letter")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain a lowercase letter")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain a number")
```

---

## Task 3: Header Injection Sanitization

**Tempo:** 1 ora
**Priority:** BASSA

### Problema

`Content-Disposition` header non sanitizzato nei filename. Un file chiamato `test.pdf"` + CRLF injection potrebbe alterare la risposta HTTP.

### Soluzione

```python
import re

def sanitize_filename(filename: str) -> str:
    """Remove dangerous characters from filename."""
    # Remove any non-printable characters
    filename = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', filename)
    # Remove quotes and CRLF
    filename = filename.replace('"', '').replace("'", "")
    filename = filename.replace('\r', '').replace('\n', '')
    return filename
```

Usare `sanitize_filename()` in ogni endpoint che restituisce `Content-Disposition`.

---

## Task 4: CSRF Protection (differita a Fase 2)

### Stato

- `allow_credentials=True` in CORS
- Backend non ha token CSRF
- Frontend non invia CSRF token

### Decisione

Differire a Fase 2 quando Stripe verrà integrato (richiede sessioni autenticate). Per ora CORS + JWT sono sufficienti.

---

## Task 5: JWT httpOnly Cookie (differita a Fase 2)

### Stato

- JWT salvato in localStorage
- XSS-vulnerabile

### Decisione

Differire a Fase 2 quando Stripe verrà integrato. Richiede cambio architettura: backend setta cookie httpOnly, frontend non gestisce token.

---

## Task 6: E2E Playwright Tests

**Tempo:** 1-2 ore per setup base
**Priority:** BASSA

### Approccio

```bash
npm init playwright@latest
# Test base: login → upload PDF → merge → download
```

### Test minimi

1. Login flow (email/password)
2. Upload PDF → verify sidebar
3. Merge 2 PDFs → verify new PDF appears
4. Logout → verify redirect

---

## Riepilogo priorità

| Task              | Tempo | Priorità  | Fatto? |
| ----------------- | ----- | --------- | ------ |
| Graceful shutdown | 1-2h  | 🔴 ALTA   | ❌     |
| Password strength | 1h    | 🟡 MEDIA  | ❌     |
| Header injection  | 1h    | 🟢 BASSA  | ❌     |
| CSRF protection   | -     | ⏳ Fase 2 | -      |
| JWT httpOnly      | -     | ⏳ Fase 2 | -      |
| E2E Playwright    | 1-2gg | 🟢 BASSA  | ❌     |
