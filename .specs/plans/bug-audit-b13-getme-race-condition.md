# Bug B13: Race condition `getMe()` iniziale — flash "logged out"

**Status:** [x] Completata (2026-07-14, PR #312)
**Priority:** HIGH
**Complexity:** Medium

## Problema

Il mount `getMe` e il login `getMe` potevano concorrere, causando un flash "logged out".

## Soluzione

Usato `_pendingAuthRef` — il finally del mount `getMe` controlla il ref prima di settare `loading=false`. Se login/register/googleLogin e in corso, salta.
