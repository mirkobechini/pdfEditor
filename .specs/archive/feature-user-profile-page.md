# Feature: User profile page (desktop)

**Status:** Non iniziata

## Obiettivo

Creare una pagina profilo utente dedicata per desktop, simile a quella della webapp. Quando si clicca sul nome utente in basso a sinistra nell'editor, deve navigare a questa pagina invece che a `/settings`.

## Dipendenze

- Editor page funzionante
- Auth con utente autenticato

## Stack

- React + TailwindCSS (desktop frontend)
- API backend per dati utente

## Output atteso

- Click sul nome utente nell'editor → naviga a `/profile` (o `/user`)
- Pagina profilo mostra: nome, email, avatar, licenza, statistiche
- Bottone "Settings" per navigare a `/settings`

## Futuro

- Il pulsante ingranaggio (⚙️) nella schermata principale farà da accesso a `/settings`
- Il nome utente andrà a `/profile`

## File coinvolti

- `desktop/frontend/src/app/profile/page.tsx` (da creare)
- `desktop/frontend/src/app/app/page.tsx` (modificare link)

## Status

[ ] Non iniziata