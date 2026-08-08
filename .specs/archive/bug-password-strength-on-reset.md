# Bug Fix Plan: Password Strength Validation on Reset Password

**Status:** ✅ Completata (2026-07-12, PR #218)
**Priority:** ALTA (Security)
**Complexity:** Trivial (1 riga)
**Estimated Time:** 5 min

---

## Problema

La funzione `_validate_password_strength()` è chiamata solo in `register()`, ma **non** in `reset_password()`. Un utente può resettare la password con una password debole (es. "abc").

## Fix

```python
# backend/app/services/auth_service.py
def reset_password(self, token: str, new_password: str) -> User:
    """Reset password using a valid reset token."""
    _validate_password_strength(new_password)  # ← AGGIUNGERE QUI
    # ... resto della logica ...
```

## File da modificare

- `backend/app/services/auth_service.py` — 1 riga

## Acceptance Criteria

- [ ] Reset password con password debole → errore
- [ ] Reset password con password forte → successo
- [ ] Test esistenti passano (228 test)