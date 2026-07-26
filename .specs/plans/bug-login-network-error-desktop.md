# Bug: "auth.common.networkError" su login email/password (desktop)

## Contesto
Quando si prova ad accedere con email e password nella desktop app, compare l'errore `auth.common.networkError` che non è umanamente leggibile.

## Cause doppie

### 1. Errore di rete reale (principale)
La desktop app punta a `http://127.0.0.1:7723` (sidecar locale) tramite `getApiBaseUrl()`. Ma il sidecar PyInstaller **non è ancora stato avviato** — la desktop fa login verso il sidecar, ma il sidecar non sta girando. Quindi la fetch fallisce con "Network error" / "Failed to fetch".

### 2. i18n key non umana
`auth.common.networkError` non è una chiave leggibile — manca la traduzione o è un placeholder.

## Fix
1. **Garantire che il sidecar parta PRIMA** della UI — `start_sidecar()` in `lib.rs` viene chiamato in `setup()`, ma la webview si apre subito. Servirebbe un delay o un health check.
2. **Migliorare la chiave i18n**: aggiungere `"common"` nel file dei messaggi con `"networkError": "Network error. Please check your connection."` (già presente in `messages/en.json`)
3. **Fallback**: mostrare messaggio raw se la chiave i18n non esiste

## Priorità
🔴 Alta — Blocca login desktop