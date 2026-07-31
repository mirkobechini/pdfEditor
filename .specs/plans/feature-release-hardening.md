# Feature: Release hardening — performance, Node24, startup UX, release artifacts, sidecar lifecycle

## Obiettivo

Risolvere 6 problemi identificati nella release v0.1.30 per rendere la build più veloce, eliminare warning, migliorare UX startup, e fixare sidecar lifecycle.

## Dipendenze

- Issue #538, #539 già mergiate su dev
- v0.1.30 rilasciata ma con warning e problemi UX

## Problemi e soluzioni

### P1 — Build troppo lenta (10+ min Windows/Linux)

**Problema**: Windows e Linux impiegano 12-16 minuti. La cache Rust è già attiva, ma `pip install pyinstaller` e `pip install -r requirements.txt` vengono eseguiti su ogni build senza cache.

**Soluzione**:

- Aggiungere `cache: "pip"` a `actions/setup-python@v5` in `release.yml`
- Spostare `pip install pyinstaller` fuori dallo step "Build sidecar" (dove viene eseguito ogni volta) in uno step separato con cache
- Il `beforeBuildCommand` builda `desktop/frontend/` (Next.js). Potremmo parallelizzare: buildare il frontend desktop in uno step separato mentre il sidecar si compila. Ma il `beforeBuildCommand` è già eseguito da Tauri, quindi non serve.

### P2 — Warning Node 20 in tutti i CI

**Problema**: Le action `actions/setup-python@v5`, `actions/upload-artifact@v4`, `actions/download-artifact@v4`, `softprops/action-gh-release@v2` usano ancora Node 20. Da giugno 2026 i runner GitHub usano Node 24 di default.

**Soluzione**: Aggiornare alla versione più recente di ogni action che supporta Node 24 nativamente:

- `actions/checkout@v5` → `actions/checkout@v7`
- `actions/setup-node@v5` → `actions/setup-node@v6`
- `actions/setup-python@v5` → `actions/setup-python@v6` (se esiste, altrimenti v5 con `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`)
- `actions/upload-artifact@v4` → `actions/upload-artifact@v5`
- `actions/download-artifact@v4` → `actions/download-artifact@v5`
- `softprops/action-gh-release@v2` → `softprops/action-gh-release@v3`
- `codecov/codecov-action@v5` → `codecov/codecov-action@v6`
- `swatinem/rust-cache@v2` → `swatinem/rust-cache@v3`
- `dtolnay/rust-toolchain@stable` → `dtolnay/rust-toolchain@stable` (Rust è compilato, non JS)
- Rimuovere `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` non appena tutte le action supportano Node 24

### P3 — Startup screen: errore senza pulsante Riprova

**Problema**: Quando la connessione al backend è rifiutata (non timeout), il codice mostra il messaggio "Nessuna risposta. Verifica che il sidecar sia presente." nello step, ma NON imposta `fatalError`. Il pulsante Riprova è visibile solo quando `fatalError` è settato. Quindi l'utente vede l'errore ma non può riprovare.

**Soluzione**: Quando lo step backend va in errore, impostare anche `fatalError` così il pulsante Riprova compare.

### P4 — Release ha solo .msi, non .exe

**Problema**: Il pattern `files: |` in `create-release` include `**/*.msi` ma non `**/*.exe`. L'NSIS installer (.exe) non viene allegato alla release.

**Soluzione**: Aggiungere `**/*.exe` (o `**/*setup.exe`) al pattern files in `release.yml`.

### P5 — Due processi fastapi-sidecar.exe

**Problema**: L'utente vede 2 processi `fastapi-sidecar.exe` in Task Manager. Possibile causa: `start_sidecar` chiamato in `.setup()` ma il sidecar viene spawnato anche da un altro punto, oppure un processo vecchio non viene killato tra un avvio e l'altro.

**Soluzione**:

- Verificare che `stop_sidecar` sia chiamato prima di avviare un nuovo sidecar
- Aggiungere log per tracciare quanti processi vengono spawnati
- Su Windows, prima di spawnare, killare eventuali processi fastapi-sidecar esistenti

### P6 — Alla chiusura dell'app, killare il sidecar (anche senza tray)

**Problema**: Attualmente il tray mantiene il sidecar in vita. Se l'utente chiude la finestra (CloseRequested), la finestra viene nascosta ma il sidecar continua. Se l'utente non vuole il tray, alla chiusura della finestra il sidecar deve essere killato.

**Soluzione**: Modificare `CloseRequested` per chiamare `stop_sidecar` e poi `app.exit(0)` invece di `window.hide()`. Rimuovere il tray (o tenerlo opzionale).

## Output atteso

1. Build Windows/Linux sotto i 10 min
2. Zero warning Node 20 nei CI
3. Startup screen mostra pulsante Riprova su errore
4. Release include .exe (NSIS installer)
5. Un solo processo fastapi-sidecar.exe
6. Sidecar killato alla chiusura dell'app

## Status

[x] P1: single-instance plugin + prevent duplicate sidecar (su dev, commit 90049be)
[x] P2: startup screen retry button (su dev, commit 45ae13e)
[x] P3: pip cache (su dev, PR #541)
[x] P4: Aggiornare versioni action per Node 24 (su dev, PR #542)
[x] P5: Aggiungere .exe ai files della release (su dev, PR #543)

## Completato

Tutti i 6 fix sono stati implementati e mergiati su dev.
[x] P6: doppio processo sidecar (su dev, commit 90049be)
