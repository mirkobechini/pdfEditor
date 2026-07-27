# Feature: "Rimani connesso" (Remember Me)

**Status:** ✅ Completata (2026-07-27, PR #449)
**Priority:** ALTA (UX)

## Obiettivo

Aggiungere checkbox "Rimani connesso" nella pagina di login, sia per web che per desktop.

## Specifiche

### Web

- Checkbox nel form di login
- Se selezionato: salvare il JWT in `localStorage` per ripristinare sessione al prossimo mount
- Se NON selezionato: JWT solo in memoria (cookie httpOnly già gestito dal backend per stesso-origin)
- All'avvio: provare a caricare token da localStorage → chiamare getMe

### Desktop

- Checkbox nel form di login
- Se selezionato: salvare JWT nel Tauri store (persistente)
- Se NON selezionato: JWT solo in memoria
- `useOfflineAuth` già leggerebbe dal store, va integrato con remember flag

## File coinvolti

- `frontend/src/app/login/page.tsx`
- `frontend/src/app/lib/auth.tsx`
- `frontend/src/app/lib/api.ts`
- `desktop/frontend-overlay/src/app/lib/useOfflineAuth.tsx`
- `frontend/messages/en.json` e `it.json`
