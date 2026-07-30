# Ottimizzazione: ridurre il tempo di build della release CI

## Situazione attuale

La release CI builda per 3 OS (Windows, macOS, Linux) in parallelo. Ogni build dura ~20-25 minuti.

## Breakdown dei tempi

| Step                        | Tempo          | Cosa fare per ridurre                         |
| --------------------------- | -------------- | --------------------------------------------- |
| npm ci (web + desktop)      | ~1 min         | Già cachato                                   |
| next build                  | ~1 min         | Minimo, necessario                            |
| pip install backend         | ~30s           | Già cachato                                   |
| Install Rust                | ~30s           | Minimo, necessario                            |
| **Install Tauri CLI**       | **~5-7 min**   | ✅ SOSTITUIBILE con npm precompilato (~1 min) |
| Build sidecar (PyInstaller) | ~2 min         | Difficile da ridurre                          |
| **cargo tauri build --ci**  | **~10-12 min** | Difficile da ridurre (compilazione crate)     |
| Upload artifacts            | ~30s           | Minimo                                        |

## Risultati dalla documentazione ufficiale Tauri

La documentazione ufficiale Tauri v2 elenca **entrambi** i metodi come equivalenti e supportati:

| Metodo                                                | Comando build                 | Installazione                |
| ----------------------------------------------------- | ----------------------------- | ---------------------------- |
| `npm install -D @tauri-apps/cli`                      | `npm run tauri build -- --ci` | Binario precompilato (JS/TS) |
| `cargo install tauri-cli --version "^2.0.0" --locked` | `cargo tauri build --ci`      | Compila da sorgente Rust     |

**Conferma**: Il CLI npm è ufficiale, equivalente, e il comando `npm run tauri build` internamente chiama `cargo tauri build`. Nessuna differenza funzionale.

## Strategia consigliata: Opzione 2 + Opzione A (combinabili)

### Opzione 2 (PRIMARIA): `@tauri-apps/cli` via npm

**Cosa fare**: Sostituire `cargo install tauri-cli` con `npm install -D @tauri-apps/cli` nel frontend desktop, e usare `npm run tauri build -- --ci` invece di `cargo tauri build --ci`.

**Risparmio**: ~5-7 min (npm installa un pacchetto JS, non compila Rust)
**Rischio**: **Nullo** — metodo ufficiale documentato da Tauri
**Stato**: ✅ Completata (PR #531) — `@tauri-apps/cli@^2.11.4` come devDependency, sostituito `cargo install` + `cargo tauri build --ci` con `npm run tauri build -- --ci`

### Opzione A (FALLBACK): Cache `~/.cargo/bin`

**Cosa fare**: Configurare `Swatinem/rust-cache` con `cache-directories: "~/.cargo/bin"` per cachare il binario di tauri-cli se si usa `cargo install`.

**Risparmio**: ~5 min (dopo la prima build)
**Rischio**: Nessuno
**Stato**: ✅ Completata (PR #531) — il preflight job in CI cattura già gli errori in 3 min

### Opzione C: Preflight + build parallelo

**Stato**: ✅ Già implementato

## Effetto combinato

Con Opzione 2 + cache Rust già presente:

| Build                       | Tempo previsto           |
| --------------------------- | ------------------------ |
| Prima build (nessuna cache) | ~15 min (invece di 25)   |
| Build successive            | ~12-15 min (cache crate) |

## Modifiche Necessarie

### 1. `desktop/frontend/package.json`

Aggiungere `@tauri-apps/cli` come devDependency:

```json
"devDependencies": {
    "@tauri-apps/cli": "^2",
    ...
}
```

### 2. `release.yml`

Sostituire:

```yaml
- name: Install Tauri CLI
  run: cargo install tauri-cli --version "^2"
```

Con:

```yaml
- name: Install Tauri CLI
  run: npm install -g @tauri-apps/cli@latest
```

E sostituire:

```yaml
- name: Build Tauri app
  run: cd desktop/src-tauri && cargo tauri build --ci
```

Con:

```yaml
- name: Build Tauri app
  run: cd desktop/frontend && npm run tauri build -- --ci
```

### 3. `Cargo.toml`

Nessuna modifica necessaria — `tauri` rimane come dipendenza Rust (serve per compilare il crate, non per il CLI).

## Nota importante

Il comando `npm run tauri build` deve essere eseguito DENTRO la cartella del frontend (dove è installato `@tauri-apps/cli`). Usa `--ci` per evitare interattività (come `cargo tauri build --ci`).

Il comando build Tauri di default usa `beforeBuildCommand` e `frontendDist` definiti in `tauri.conf.json`, quindi non serve specificarli manualmente.
