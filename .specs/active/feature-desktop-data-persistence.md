# Feature: Persistenza dati desktop tra aggiornamenti

## Obiettivo

I PDF caricati e il database SQLite devono sopravvivere alla reinstallazione dell'app desktop. Attualmente, il sidecar usa percorsi relativi che vengono resettati a ogni nuova build.

## Contesto

Il sidecar PyInstaller estrae i file in una directory temporanea (`_MEI*`). Quando si installa una nuova versione:

- `pdfeditor.db` (SQLite) — viene creato ex-novo
- `storage/pdfs/` — PDF salvati su disco, ma non più referenziati nel DB

## Soluzione

1. **Database SQLite**: spostare in `%APPDATA%/PdfEditor/pdfeditor.db` (o `~/.local/share/PdfEditor/` su Linux)
2. **Storage PDF**: spostare in `%APPDATA%/PdfEditor/storage/pdfs/`
3. **Snapshots**: spostare in `%APPDATA%/PdfEditor/storage/snapshots/`
4. **Config**: `run_backend.py` deve impostare `DATABASE_URL` e `UPLOAD_DIR` prima di avviare FastAPI

## Dettagli implementazione

In `run_backend.py`:

```python
def _get_app_data_dir() -> str:
    if sys.platform == "win32":
        base = os.environ.get("APPDATA", os.path.expanduser("~"))
        return os.path.join(base, "PdfEditor")
    return os.path.join(os.path.expanduser("~"), ".local", "share", "PdfEditor")

def _ensure_dirs():
    data_dir = _get_app_data_dir()
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(os.path.join(data_dir, "storage", "pdfs"), exist_ok=True)
    os.makedirs(os.path.join(data_dir, "storage", "snapshots"), exist_ok=True)
    # Set env vars BEFORE Settings is imported
    os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(data_dir, 'pdfeditor.db').replace(os.sep, '/')}")
    os.environ.setdefault("UPLOAD_DIR", os.path.join(data_dir, "storage", "pdfs"))
```

## Output atteso

- Dopo installazione nuova versione, PDF e DB sono ancora presenti
- `%APPDATA%/PdfEditor/` contiene DB, PDF, snapshots

## Status

[x] Non iniziata
