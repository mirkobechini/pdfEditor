# Feature: Google login persistence e profilo utente su desktop

## Obiettivo

1. Dopo login Google, mantenere la sessione ai riavvii successivi (come già fa mobile)
2. Aggiungere pagina profilo utente con account collegati (Google link/unlink)
3. Stessa funzionalità della webapp

## Stato attuale

- Google login funziona (redirect flow)
- Token NON viene persistito localmente dopo login Google su desktop
- Pagina profilo (`/profile`) esiste ma va verificata

## Cosa fare

1. **Persistenza login**: dopo Google login, salvare JWT in Tauri store (come già fa per login email/password)
2. **Profilo utente**: pagina `/profile` con:
   - Nome, email, avatar
   - Account collegati (Google)
   - Pulsante "Collega Google" / "Scollega Google"
3. **Collegamento Google**: endpoint già esiste (`POST /auth/google` per link)

## Dipendenze

- `shared/src/auth.tsx` — già gestisce persistenza per login email
- `backend/app/api/v1/auth.py` — già ha endpoint per link/unlink Google

## Status

[ ] Non iniziata
