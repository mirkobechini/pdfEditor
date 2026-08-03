# Feature: "Rimani connesso" (Remember Me) — Desktop

**Status:** Non iniziata
**Priority:** ALTA (UX)

## Obiettivo

Rendere funzionante il checkbox "Rimani connesso" nella pagina di login desktop, con corretta visualizzazione dello stato (checkmark visibile solo quando checked).

## Situazione attuale

- Checkbox già presente nel form di login desktop (`desktop/frontend/src/app/login/page.tsx`)
- Già inizializzato a `true` con `useState(true)`
- Già passato alla funzione `login()` come parametro `remember`
- `auth.tsx` già gestisce il salvataggio in Tauri store se `remember=true`
- **Bug**: la spunta `✓` è sempre visibile (non dipende dallo stato `checked`), quindi sembra che non si possa deselezionare

## Fix necessari

### 1. Visuale — spunta condizionale
Mostrare `✓` solo quando `remember === true`:
```tsx
{remember && <span className="text-[10px] font-black text-white">✓</span>}
```

### 2. Stato predefinito
Valutare se mantenere `true` come default o cambiare a `false`.

## File coinvolti

- `desktop/frontend/src/app/login/page.tsx`
- `desktop/frontend/src/shared/auth.tsx` (già funzionante)
- `desktop/frontend/messages/en.json` e `it.json` (chiave `rememberMe` già presente)

## Output atteso

- Checkbox "Rimani connesso" cliccabile
- Spunta visibile solo quando selezionato
- Se selezionato: JWT salvato in Tauri store (persistente)
- Se NON selezionato: JWT solo in memoria
- Al riavvio: se token in store → login automatico

## Status

[ ] Non iniziata
