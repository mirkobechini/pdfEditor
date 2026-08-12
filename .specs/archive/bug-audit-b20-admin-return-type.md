# Bug B20: Tipo di ritorno errato in admin.py

**Status:** [x] Completata (2026-07-15, PR #326)
**Priority:** MEDIUM
**Complexity:** Low

## Problema

Annotation `-> list[UserResponse]` ma restituiva `UserListResponse`.

## Soluzione

Corretta annotation a `-> UserListResponse`.
