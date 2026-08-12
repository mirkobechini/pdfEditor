# Feature: Enforcement licenze

**Status:** ✅ Completata (2026-07-01)

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

[x] Completata
**Completata il:** 2026-06-25
**Note:** verify_feature_access() dependency in deps.py. Protegge merge/split/reorder/remove-pages/replace-text/extract-text/edit-metadata/export/import. Admin bypass. Formato-specific feature keys per export/import. 93 test backend totali, tutti passanti. PR #62 merged in dev, closes #61.
