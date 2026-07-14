# Bug B10: `login()` fallisce silenziosamente — token settato ma UI non aggiornata

**Status:** [x] Completata (2026-07-14, PR #306)
**Priority:** HIGH
**Complexity:** Low

## Problema

Login/register/googleLogin potevano salvare il token ma se getMe() falliva, l'utente vedeva 'non loggato' nonostante avesse token valido.

## Soluzione

Se getMe fallisce dopo auth riuscito, redirect a / che triggera getMe automaticamente via useEffect di mount.
