# Bug: Navbar — doppio nome + layout rotto

**Status:** ✅ Completata (2026-07-13)
**Priority:** MEDIUM
**Complexity:** Low

## Problema

Nella navbar:

- Nome utente "Mirko Bechini ⚙️" appariva due volte
- Layout visivo disordinato (emoji sole, IT, EN, Admin, Segnala Bug tutti sulla stessa riga)

## Causa probabile

Il componente `HeaderControls` mostra `user.full_name ⚙️` e viene renderizzato sia dalla pagina principale che dal layout. Potrebbe essere renderizzato due volte.

## Soluzione

Tracciare dove HeaderControls è chiamato e assicurarsi che sia renderizzato una sola volta.
