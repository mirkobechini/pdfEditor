# Feature: Fix Python DLL error on startup (corrupted _MEI temp dir)

## Obiettivo

Risolvere il popup "Failed to load Python DLL" che appare a ogni avvio dell'app dopo un kill forzato del sidecar.

## Dipendenze

- Issue #555 aperta

## Problema

Quando il sidecar PyInstaller viene killato forzatamente (`taskkill /F`), la directory temporanea `_MEI*` viene lasciata in stato corrotto (file mancanti, DLL parzialmente scritte). Al prossimo avvio, PyInstaller vede la directory `_MEI*` (bloccata dalla cache), prova a caricare `python312.dll` da lì, e fallisce con:

```
Failed to load Python DLL
'C:\Users\...\AppData\Local\PdfEditor\_MEI412562\python312.dll'
LoadLibrary: Accesso a posizione di memoria non valido.
```

**Causa**: PyInstaller tiene una cache delle directory `_MEI*` e le riutilizza senza verificarne l'integrità. La directory `_MEI*` esiste ma è corrotta.

## Soluzione

In `start_sidecar` (Rust, `lib.rs`), PRIMA di spawnare il sidecar:
1. Cercare directory `_MEI*` in `%TEMP%` (o `$TMPDIR`)
2. Eliminarle tutte (sono orfane — nessun processo PyInstaller è in esecuzione)

In alternativa, più sicura: pulire solo dopo aver verificato che nessun sidecar è in esecuzione (port check 7723 fallisce).

**File**: `desktop/src-tauri/src/lib.rs`

## Output atteso

Nessun popup Python DLL error all'avvio.

## Status

[ ] Plan approvato — branch + PR