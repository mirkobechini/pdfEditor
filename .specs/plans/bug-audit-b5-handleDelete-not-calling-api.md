# Bug B5: `handleDelete` non chiama `api.deletePdf` — desync UI/DB

**Status:** [ ] Non iniziata
**Priority:** CRITICAL
**Complexity:** Medium

## Problema

In `frontend/src/app/app/page.tsx`, `handleDelete()` aggiorna solo la UI (setSelectedId, sidebarRefreshKey) ma **non chiama effettivamente `api.deletePdf`**. L'eliminazione reale avviene in `DeleteModal.tsx`, ma se l'API fallisce lì, `handleDelete` viene comunque eseguito su `onConfirm` e la UI mostra il file come eliminato quando invece il server lo ha ancora.

## Soluzione

Spostare la chiamata `api.deletePdf` in `handleDelete` e passare l'errore a `DeleteModal` per gestirlo. In alternativa, `handleDelete` dovrebbe essere async e chiamare `api.deletePdf` prima di aggiornare la UI.

## File da modificare

- `frontend/src/app/app/page.tsx`
- `frontend/src/app/components/DeleteModal.tsx` (verificare flusso onConfirm)
