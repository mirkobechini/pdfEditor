# Feature: Further build optimizations — UPX, pip cache, matrix split, Rust strip

## Obiettivo

Ridurre ulteriormente i tempi di build e le dimensioni degli artifact dopo i fix P2/P3 di #544.

## Dipendenze

- #544 già risolta (P2: frontend build separato, P3: strip sidecar)
- v0.1.32 in rilascio

## Problemi e soluzioni

### O1 — UPX compression del sidecar

**Problema**: Il sidecar PyInstaller occupa ~60-80MB non compresso. Con UPX si può ridurre del 50-70%.

**Soluzione**: Installare UPX in CI e abilitare la compressione UPX in PyInstaller.
- `pip install upx` non esiste — va installato via package manager
- macOS: `brew install upx` (non disponibile su runner, va installato via brew)
- Linux: `apt-get install upx` o scaricare binario
- Windows: `choco install upx` o scaricare .exe
- PyInstaller rileva UPX automaticamente se sul PATH, oppure con `--upx-dir`

**Stima risparmio**: sidecar 60MB → ~20MB. Build più lenta di ~30s (UPX compression time).

**File**: `.github/workflows/release.yml`

### O2 — Caching PyInstaller pip install

**Problema**: `pip install pyinstaller` viene eseguito su ogni build in CI, ma non c'è cache pip per `pip install pyinstaller` nello step "Build sidecar" (il cache pip configurato è solo per `backend/requirements.txt`).

**Soluzione**: Il `cache: "pip"` su `setup-python@v7` già cachea tutte le installazioni pip. Il problema è che `pip install pyinstaller` nello step "Build sidecar" è separato dalla directory `backend/`. Dobbiamo unificare o aggiungere un cache-dependency-path aggiuntivo.

**Alternativa**: Installare PyInstaller nella stessa directory di backend.

**File**: `.github/workflows/release.yml`

### O3 — Build matrix split (sidecar + frontend paralleli)

**Problema**: Attualmente il job `build` esegue sequenzialmente: frontend → backend → sidecar → Tauri build. Anche se abbiamo separato frontend build, è ancora nello stesso job.

**Soluzione**: Creare un job `build-frontend` e `build-sidecar` che girano in parallelo su ubuntu-latest (veloce), poi il job `build` dipende da entrambi e fa solo il Tauri build su ogni OS.

**Vantaggio**: Frontend + sidecar buildati in parallelo (~3 min invece di ~5 min sequenziale). Soprattutto su Windows/Linux dove sidecar build è più lento.

**File**: `.github/workflows/release.yml`

### O4 — Rust binary strip (release profile)

**Problema**: Il binario Rust compilato contiene simboli di debug. `cargo build --release` produce un binario più grande del necessario.

**Soluzione**: Aggiungere al `Cargo.toml`:
```toml
[profile.release]
strip = true
```

Questo dice a Rust di rimuovere i simboli di debug dal binario release, riducendo la dimensione del .exe/.dmg/.AppImage del 10-20%.

**Nota**: Non rallenta la build — è un'operazione del linker già in fase di compilazione.

**File**: `desktop/src-tauri/Cargo.toml`

## Output atteso

1. AppImage: ~140MB → ~80MB (UPX)
2. Build Windows: ~10min → ~7min (frontend/sidecar paralleli)
3. Build Linux: ~13min → ~9min (frontend/sidecar paralleli)
4. Rust binary: ~10-20% più piccolo (strip)

## Status

[x] O1: UPX compression — in PR #549
[ ] O2: PyInstaller cache — plan approvato
[ ] O3: Build matrix split — plan approvato
[ ] O4: Rust strip profile — plan approvato