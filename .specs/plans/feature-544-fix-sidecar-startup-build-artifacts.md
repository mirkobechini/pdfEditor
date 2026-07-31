# Feature: Fix sidecar startup crash, slow builds, large artifacts

## Obiettivo

Risolvere 3 problemi critici della release v0.1.31:
1. Sidecar non parte al primo avvio (startup crash)
2. Build lenta (Windows 11min, Linux 15min)
3. Artefatto Linux 729MB (troppo grande)

## Dipendenze

- Issue #544 aperta

## Problemi e soluzioni

### P1 — Sidecar non parte al primo avvio

**Problema**: `startup/page.tsx` mostra errore immediato su `ECONNREFUSED` (connessione rifiutata) quando il sidecar non è ancora pronto. Il sidecar PyInstaller impiega 5-15 secondi al primo avvio. Il codice va in `catch` e mostra subito "Impossibile contattare il backend" invece di ritentare.

**Soluzione**: Nel `catch`, non mostrare errore per `ECONNREFUSED`. Continuare a ritentare per tutti i 60 tentativi (60 secondi). Solo se tutti i 60 tentativi falliscono, mostrare errore (come già avviene per il timeout).

**File**: `desktop/frontend/src/app/startup/page.tsx`

### P2 — Build lenta (Windows 11min, Linux 15min)

**Problema**: `beforeBuildCommand` in `tauri.conf.json` esegue `next build` dentro `tauri build`. È sequenziale: prima frontend, poi Rust. Separando i due step, il frontend può essere buildato in uno step CI parallelo.

**Soluzione**: 
- Rimuovere `beforeBuildCommand` da `tauri.conf.json` (sostituire con `"beforeBuildCommand": ""`)
- In `release.yml`: buildare `desktop/frontend/` in uno step esplicito PRIMA di `npm --prefix ../frontend exec tauri build -- --ci`
- Tauri build troverà già `desktop/frontend/out/` pronto

**File**: `desktop/src-tauri/tauri.conf.json`, `.github/workflows/release.yml`

### P3 — Artefatto Linux 729MB (troppo grande)

**Problema**: L'AppImage è 174MB, il .deb è 99MB. Il sidecar PyInstaller include Python + dipendenze. 729MB è probabilmente il `target/` directory completo (con file oggetto Rust) caricato come artifact.

**Soluzione**: 
- Verificare che `upload-artifact` includa solo `target/release/bundle/` (già configurato così)
- Aggiungere UPX compression nel build-sidecar.sh per ridurre il sidecar
- Aggiungere `--strip` al build-sidecar.sh per rimuovere simboli di debug

**File**: `desktop/build-sidecar.sh`

## Output atteso

1. Startup: se il sidecar impiega >1s, l'utente vede spinner senza errore fino a 60s
2. Build Windows < 8min, Linux < 10min
3. Artefatto Linux < 200MB per AppImage

## Status

[x] P1: Sidecar startup fix (su dev, PR #545)
[ ] P2: Build speed — separare frontend build da Tauri build
[ ] P3: Artifact size — UPX compression