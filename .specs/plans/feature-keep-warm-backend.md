# Feature: Keep-warm backend cloud + miglioramento UI loading

**Status:** Non iniziata

## Obiettivo

Rendere invisibile all'utente il cold start del backend su Render (Neon), che richiede qualche secondo per riattivarsi dopo periodi di inattività.

## Soluzione A — Migliorare UI loading (immediata)

### Cosa fare

Durante il login, quando il backend cloud è in fase di risveglio, mostrare un messaggio esplicito all'utente invece di un generico loading.

### File coinvolti

- `shared/src/auth.tsx` — nelle funzioni `login()` e `register()`, quando si aspetta la risposta della cloud API, mostrare "Risveglio del server cloud in corso..." invece di un loader generico

### Output atteso

- L'utente vede un messaggio che spiega l'attesa, non pensa che l'app sia rotta

## Soluzione B — Keep-warm dal sidecar (strutturale)

### Cosa fare

Il sidecar (FastAPI locale, sempre acceso) fa un ping periodico a `https://pdfeditor-api.mirkobechini.com/health` ogni 5 minuti, mantenendo il backend cloud sveglio.

### Opzioni implementazione

1. **Backend Python**: aggiungere un task schedulato in `main.py` con `asyncio` o `threading.Timer` che pinga il cloud API
2. **Rust sidecar**: aggiungere un thread in `lib.rs` che fa una richiesta HTTP periodica (più complesso, richiede una crate HTTP)

### Soluzione consigliata

Opzione 1 (backend Python) — più semplice, già in `main.py`, nessuna dipendenza extra.

### File coinvolti

- `backend/app/main.py` — aggiungere `_start_keep_warm()` in `lifespan` o all'avvio

### Output atteso

- Il backend cloud non va mai in cold start quando il desktop è aperto
- Ping ogni 5 minuti a `https://pdfeditor-api.mirkobechini.com/health`
- Consumo trascurabile (0.1h/mese di compute)

## Dipendenze

- Nessuna

## Stack

- Python (httpx o requests) per il keep-warm
- React per il miglioramento UI

## Status

[ ] Non iniziata
