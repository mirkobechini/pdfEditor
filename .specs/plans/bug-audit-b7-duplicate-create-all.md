# Bug B7: `_run_migrations()` chiamato 2 volte all'avvio

**Status:** [x] Completata (2026-07-14, PR #300)
**Priority:** HIGH
**Complexity:** Low

## Problema

`lifespan` chiamava `_run_migrations()` (che già fa `Base.metadata.create_all()`) e subito dopo `Base.metadata.create_all()` di nuovo.

## Soluzione

Rimossa la seconda chiamata ridondante da `lifespan`.
