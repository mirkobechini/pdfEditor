# Feature: Enforcement licenze

## Obiettivo

Aggiungere middleware/dependency injection che blocchi le operazioni non consentite in base al `license_tier` dell'utente, utilizzando i dati di `LicenseFeature`.

## Dipendenze

- Backend API auth funzionante ✅
- Modelli licensing esistenti ✅

## Stack

- FastAPI (dependencies)
- SQLAlchemy 2.0

## Output atteso

- Funzione `verify_feature_access(feature: str)` come FastAPI dependency
- Protezione endpoint: merge/split, conversione, modifica testo, export PNG/JPG, modifica metadati
- Test che verificano il blocco per tier free e il permesso per tier premium/lifetime/admin
- Compatibilità con utenti non autenticati (modalità offline: restrizione lato frontend)

## Status

[ ] Non iniziata
