# Bug: Upload PDF 403 CSRF validation failed (K3)

## Obiettivo

Risolvere il 403 CSRF durante l'upload PDF su sidecar Tauri. Il cookie CSRF non viene inviato dal browser su POST cross-site (origin `http://tauri.localhost` → target `127.0.0.1:7723`) a causa di `SameSite=Lax`.

## Contesto

- **KNOWN_ISSUES.md K3**: Upload PDF 403 (CSRF validation failed)
- Fix già implementato in `backend/app/core/csrf.py`: `SameSite=None` su localhost
- Da testare con nuova build desktop

## Verifica

1. Buildare il sidecar con il fix CSRF
2. Testare upload PDF da desktop Tauri
3. Verificare che il cookie CSRF venga inviato correttamente

## Risoluzione

- Fix già implementato in `csrf.py` (linee 59-69)
- Serve solo test con nuova build

## Output atteso

- Upload PDF funzionante su desktop Tauri senza 403 CSRF

## Status

[ ] Non iniziata
