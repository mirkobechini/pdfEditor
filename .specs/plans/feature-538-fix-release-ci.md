# Feature: Fix release CI — release.yml hardening

## Obiettivo

Risolvere tutti i problemi identificati nel workflow `release.yml` che impediscono alla release CI di completarsi con successo su tutti e 3 gli OS (Windows, macOS, Linux).

## Dipendenze

- Issue #538 aperta e branch `feature/538-fix-macos-release` creato su `dev`

## Stack

- GitHub Actions (release.yml)
- @tauri-apps/cli via npm (devDependency in desktop/frontend/)
- dtolnay/rust-toolchain per Rust
- Swatinem/rust-cache per cache Rust
- softprops/action-gh-release per pubblicazione GitHub Release

## Problemi identificati

| #   | Problema                                                                                                            |     Gravità      | Fix                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------- | :--------------: | ------------------------------------------------------ |
| 1   | `npx tauri build` da `desktop/src-tauri/` non trova `@tauri-apps/cli` (binario in `desktop/frontend/node_modules/`) |   🔴 Bloccante   | ✅ `npm --prefix ../frontend exec tauri build -- --ci` |
| 2   | Step "Install Tauri CLI" è un no-op (solo echo)                                                                     |   🟢 Cosmetico   | Rimuovere lo step                                      |
| 3   | Manca `cache: 'npm'` su `setup-node`                                                                                |  🟢 Performance  | Aggiungere `cache: 'npm'` + `cache-dependency-path`    |
| 4   | Manca `Swatinem/rust-cache`                                                                                         |  🟢 Performance  | Aggiungere dopo Rust install                           |
| 5   | Manca `x86_64-apple-darwin` target su macOS                                                                         |  🟡 Preventive   | Aggiungere ai targets                                  |
| 6   | Manca `draft: true` su create-release                                                                               | 🟡 Best practice | Aggiungere `draft: true`                               |
| 7   | Manca `files:` esplicito su create-release                                                                          | 🟢 Best practice | Aggiungere `files: PdfEditor_*`                        |

## Output atteso

Release CI verde su tutti e 3 gli OS (Windows, macOS, Linux) con installer pubblicati su GitHub Releases.

## Status

[x] Fix 1: `npm --prefix ../frontend exec tauri build -- --ci` (completato)
[x] Fix 2: Rimuovere step "Install Tauri CLI" (completato)
[x] Fix 3: Aggiungere npm cache (completato)
[x] Fix 4: Aggiungere Rust cache (completato)
[x] Fix 5: Aggiungere x86_64-apple-darwin target (completato)
[x] Fix 6: Aggiungere draft: true (completato dall'utente)
[x] Fix 7: Aggiungere files: esplicito (completato dall'utente)
[ ] Commit atomici + PR su dev
