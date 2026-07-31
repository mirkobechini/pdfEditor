# Feature: Fix startup page — getApiBaseUrl non funziona in produzione

## Obiettivo
Risolvere definitivamente il problema: la startup page non contatta il sidecar perché `getApiBaseUrl()` non restituisce `127.0.0.1:7723` nella build produzione.

## Problema
`getApiBaseUrl()` in `desktop/frontend/src/shared/tauri.ts` usa `isTauri()` per decidere l'URL. In produzione (static export), `process.env.NEXT_PUBLIC_API_URL` non viene inlineato nei chunk JS delle pagine, e `window.__TAURI__` potrebbe non essere ancora definito al primo render.

## Soluzione
Sostituire `getApiBaseUrl()` nel frontend desktop con una funzione che restituisce sempre `http://127.0.0.1:7723` — in desktop non c'è altra possibilità. Il fallback a `localhost:8000` non ha senso in questa codebase.

Alternativa: sostituire `const API_BASE = getApiBaseUrl()` con `const API_BASE = "http://127.0.0.1:7723"` nella startup page.

## File
- `desktop/frontend/src/shared/tauri.ts`

## Output atteso
Startup page contatta sempre `127.0.0.1:7723` anche in produzione.

## Status
[ ] Plan approvato — branch + PR