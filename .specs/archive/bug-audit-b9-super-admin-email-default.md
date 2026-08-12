# Bug B9: `SUPER_ADMIN_EMAIL` default pericoloso

**Status:** [x] Completata (2026-07-14, PR #304)
**Priority:** HIGH
**Complexity:** Low

## Problema

`SUPER_ADMIN_EMAIL` defaultava a `"admin@pdfeditor.local"` — chiunque si registrasse con quell'email diventava admin.

## Soluzione

In `_validate_settings()`: se `DEBUG=False` e `SUPER_ADMIN_EMAIL` è ancora il default, blocca l'avvio con `RuntimeError` (Opzione B di due proposte).
