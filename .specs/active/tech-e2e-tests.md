# Technical Debt: Zero test E2E / integration (T2)

## Obiettivo

Aggiungere test E2E con Playwright per coprire flussi cross-origin reali (cookie, CSRF, CORS) che i test unitari non coprono.

## Contesto

- **KNOWN_ISSUES.md T2**: Zero test E2E / integration
- 369 test backend (con TestClient same-origin) + 363 test frontend (jsdom)
- Nessun test E2E che copra flussi reali

## Cosa testare (priorità)

1. **Auth flow**: registrazione → login → JWT refresh → logout
2. **Upload PDF**: upload → lista → download
3. **Modifica PDF**: merge, split, reorder
4. **CSRF**: verifica che il token CSRF funzioni cross-origin
5. **CORS**: verifica che le richieste cross-origin funzionino

## Stack proposto

- **Playwright** (come da KNOWN_ISSUES.md T7)
- Test su backend Render (cloud) o locale
- CI integration con GitHub Actions

## Output atteso

- Suite di test E2E funzionante
- Copertura dei flussi principali
- Integrazione CI

## Status

[ ] Non iniziata
