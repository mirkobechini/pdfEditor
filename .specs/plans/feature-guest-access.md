# Feature: Accesso Guest — uso senza login

## Obiettivo
Permettere all'utente di usare l'applicazione senza autenticazione, sia nella webapp che nella desktop app.

## Perché
L'utente vuole provare l'app senza registrarsi. Attualmente ogni operazione PDF richiede login perché ogni PDF è associato a un user_id.

## Cosa serve

### Backend
- [ ] Schema: `is_guest` flag sul modello `User` esistente (o creare `GuestSession`)
- [ ] Endpoint: `POST /auth/guest` — crea un utente guest temporaneo con JWT
- [ ] Endpoint: `POST /auth/guest/convert` — converte guest in utente registrato (email + password)
- [ ] I PDF creati da guest devono essere accessibili senza user_id fisso
- [ ] Cleanup periodico dei guest account (es. dopo 24h)

### Frontend
- [ ] Pulsante "Continua come ospite" nella login page
- [ ] Badge "Guest mode" nell'header quando si è in sessione guest
- [ ] Banner che invita a registrarsi
- [ ] Conversione guest → utente reale con dati preservati

### Desktop
- [ ] Guest mode di default all'avvio — nessun login richiesto
- [ ] Opzione "Registrati/Accedi" nel menu per sync cloud

## Stack
- Backend: FastAPI + SQLAlchemy (campo `is_guest: bool` su User)
- Frontend: React — già presente login/register pattern
- Desktop: sidecar locale per PDF processing, sync solo se loggato

## Output atteso
Utente apre l'app, clicca "Continua come ospite", usa tutte le funzionalità PDF offline, può registrarsi in qualsiasi momento per salvare dati e abilitare cloud sync.

## Priorità
🟡 Media — Feature importante per onboarding

## Dipendenze
- Nessuna — feature indipendente

## Status

[ ] Non iniziata