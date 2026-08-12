# Feature: Fix startup screen — API_BASE non rileva Tauri environment

## Obiettivo
Risolvere il problema per cui la startup screen non riesce a contattare il backend (sidecar) perché `getApiBaseUrl()` non rileva l'ambiente Tauri.

## Problema
`getApiBaseUrl()` in `tauri.ts` usa `isTauri()` (check `window.__TAURI__`) per decidere se usare `127.0.0.1:7723` (sidecar) o `localhost:8000` (web). Se `window.__TAURI__` non è ancora disponibile al momento della chiamata (race condition all'avvio della webview), la startup page prova a contattare `localhost:8000` invece di `127.0.0.1:7723`. Il sidecar è su 7723 → tutti i 60 tentativi falliscono.

## Soluzione
Forzare `NEXT_PUBLIC_API_URL` a `http://127.0.0.1:7723` in `next.config.ts` del frontend desktop. Così `getApiBaseUrl()` usa sempre l'URL corretto senza dipendere da `isTauri()`.

## File
- `desktop/frontend/next.config.ts` — aggiungere `NEXT_PUBLIC_API_URL: "http://127.0.0.1:7723"`

## Output atteso
Startup screen contatta il sidecar correttamente fin dal primo tentativo.

## Status
[ ] Plan approvato — branch + PR