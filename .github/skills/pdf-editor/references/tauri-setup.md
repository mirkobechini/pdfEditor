# Tauri Setup Guide (Fase 1c)

## Prerequisiti

- Rust toolchain: `rustup install stable`
- Tauri CLI: `cargo install tauri-cli --version "^2"`
- Un bundle PyInstaller di FastAPI per il sidecar (opzionale in dev)

## Struttura Tauri prevista

```
pdf-editor-tauri/           # Cartella separata o dentro frontend/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json     # Config sidecar + window
│   ├── capabilities/
│   │   └── default.json    # Permessi sidecar
│   └── src/
│       └── main.rs         # Rust entrypoint
└── binaries/               # PyInstaller bundle (sidecar)
```

## Sidecar FastAPI

In produzione, FastAPI va bundlato con PyInstaller:

```bash
pip install pyinstaller
pyinstaller --onefile --name pdf-editor-backend backend/app/main.py
```

Il binario va copiato in `src-tauri/binaries/` con il suffisso di piattaforma.

## tauri.conf.json (bozza)

```json
{
  "productName": "PdfEditor",
  "version": "0.1.0",
  "identifier": "com.pdfeditor.app",
  "build": {
    "frontendDist": "../frontend/out"
  },
  "app": {
    "windows": [
      {
        "title": "PdfEditor",
        "width": 1280,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "icon": ["icons/icon.png"]
  }
}
```

## Comandi utili

```bash
# Sviluppo (frontend + Tauri)
cd frontend && next build && cd ..
cargo tauri dev

# Build produzione
cargo tauri build
```
