# Feature: Persistent database path for desktop app

**Status:** Non iniziata

## Obiettivo

Fare in modo che il database SQLite e i PDF caricati persistano tra le reinstallazioni dell'app desktop.

## Problema

Il sidecar usa `DATABASE_URL=sqlite:///./pdfeditor.db` — path **relativo** alla directory corrente. Quando l'app viene reinstallata (e la directory cambia), il DB parte da zero e i PDF caricati in precedenza diventano "fantasma" (record nel DB ma file su disco mancanti).

## Soluzione proposta

1. Modificare `.env.desktop` e `run_backend.py` per usare un path persistente:
   - Windows: `%APPDATA%/PdfEditor/`
   - macOS: `~/Library/Application Support/PdfEditor/`
   - Linux: `~/.local/share/PdfEditor/`
2. `STORAGE_LOCAL_PATH` e `DATABASE_URL` devono puntare a quella directory
3. Creare la directory all'avvio se non esiste

## File coinvolti

- `desktop/.env.desktop`
- `desktop/run_backend.py`
- `backend/app/core/config.py`

## Output atteso

- DB e PDF persistono tra installazioni/aggiornamenti
- Ghost PDF non ricompaiono più

## Status

[ ] Non iniziata
