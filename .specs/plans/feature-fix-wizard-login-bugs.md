# Feature: Fix wizard prompt() error, guest login crash, login invalid credentials

## Obiettivo
Risolvere 3 bug identificati in modalità sviluppo desktop.

## Problemi

### B1 — prompt() is not supported (wizard folder picker)
**Errore**: `prompt() is not supported` quando si clicca "Sfoglia" per la cartella di lavoro nel wizard.
**Causa**: Tauri webview non supporta `prompt()`. Il codice chiama `prompt()` senza try/catch, ed è previsto solo per browser.
**Soluzione**: Avvolgere `prompt()` in un try/catch con fallback a un input nascosto o a un valore di default.

### B2 — Guest login: errore imprevisto
**Errore**: "Continue as Guest" dà un errore generico.
**Causa**: Da verificare — probabilmente il backend non ha il database inizializzato o manca la migrazione per `is_guest`.
**Soluzione**: Verificare che il backend gestisca correttamente `POST /auth/guest` e che la startup esegua le migrazioni.

### B3 — Login: email o password non validi
**Errore**: Login con email/password dà "Invalid email or password".
**Causa**: Probabile che il database sia vuoto (nessun utente registrato). Serve seed del super admin o registrazione prima del login.
**Soluzione**: Verificare che la migrazione e seed vengano eseguiti all'avvio del backend.

## Output atteso
- Wizard: pulsante "Sfoglia" funziona (fallback a input text per percorso)
- Guest login: crea account guest e reindirizza all'app
- Login: permette registrazione o seed automatico del super admin

## Status
[ ] Plan approvato — branch + PR