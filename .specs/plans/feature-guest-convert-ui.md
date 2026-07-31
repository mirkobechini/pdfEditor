# Feature: Guest convert UI — trasforma account guest in account completo

## Obiettivo
Permettere all'utente guest di convertire il proprio account temporaneo in un account completo (email + password) per salvare i dati e accedere a feature premium future.

## Dipendenze
- Backend: `POST /auth/guest/convert` già implementato ✅
- API client: `api.guestConvert(email, password)` già implementato ✅
- UI: **mancante** ❌

## Flusso utente
1. Utente fa Guest login → entra nell'app come guest
2. Nella sidebar/header, badge "Guest" con pulsante "Converti in account completo"
3. Click → form modale con email + password + nome completo
4. Submit → chiama `api.guestConvert()` → logout → redirect a login con messaggio "Account creato! Ora accedi con le tue credenziali."

## Stack
- React 19 + TailwindCSS v4 (stesso stile del resto dell'app desktop)
- Componente modale/banner già esistente in web frontend (da adattare)

## File
- `desktop/frontend/src/app/components/GuestConvertBanner.tsx` — banner + form modale
- `desktop/frontend/src/app/login/page.tsx` — messaggio di conferma dopo conversione

## Output atteso
- Utente guest vede banner "Account temporaneo" con pulsante "Converti"
- Modale con form (email, password, nome)
- Dopo conversione: logout + redirect a login con messaggio di successo

## Status
[ ] Plan approvato — branch + PR