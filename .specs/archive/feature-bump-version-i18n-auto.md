# Feature: Bump automatico versione anche nei file i18n

## Problema

Il bump di versione aggiorna solo i file di configurazione (package.json, Cargo.toml, tauri.conf.json, startup/page.tsx, package-lock.json) ma **non aggiorna** i messaggi i18n:

- `desktop/frontend/messages/en.json` — "version": "v0.1.19"
- `desktop/frontend/messages/it.json` — "version": "v0.1.19"
- `frontend/messages/en.json` — "version": "v0.1.19"
- `frontend/messages/it.json` — "version": "v0.1.19"

## Fix

### Opzione 1: Script centralizzato

Creare uno script `scripts/bump-version.sh` che aggiorni TUTTI i file:

- package.json (web + desktop)
- package-lock.json (desktop)
- Cargo.toml
- tauri.conf.json
- startup/page.tsx
- messages/en.json (web + desktop)
- messages/it.json (web + desktop)
- pyproject.toml

### Opzione 2: Includere nel preflight check

Il preflight check (6/6) dovrebbe anche verificare che i messaggi i18n siano allineati con la versione attuale.

## Output atteso

- [ ] Bump script aggiorna TUTTI i file con versione
- [ ] Preflight segnala se i messaggi non sono allineati
- [ ] Login page mostra versione corretta

## Priorità

🟡 Media — UX, non blocca il funzionamento.
