# Bug: Admin panel mostra "Nessun utente"

**Status:** Open
**Priority:** HIGH
**Complexity:** Medium

## Problema

La tabella utenti nell'admin panel mostra "Nessun utente" nonostante ci siano utenti registrati.

## Causa probabile

`api.listUsers()` chiama `GET /admin/users` che è protetto da `get_current_user` (JWT). Con il nuovo flusso cookie-based, il token non viene inviato correttamente.

## Soluzione

1. Verificare che l'admin endpoint `/admin/users` riceva il cookie
2. Testare la chiamata dal browser per vedere se arriva 401 o 200
3. Eventualmente supportare sia cookie che Bearer header come già fa `/auth/me`
