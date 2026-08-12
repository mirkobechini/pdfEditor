# Feature: Disable License Enforcement (Tutto Aperto per Fase Web)

**Status:** ✅ Completata (2026-07-01)

**Issue Number**: issue-146

## Obiettivo

Disabilitare temporaneamente l'enforcement delle licenze per la Fase Web (Fase 2), in modo che **tutte le funzionalità siano disponibili per tutti gli utenti registrati**, indipendentemente dal tier. Le licenze rimangono nel codice (modello, admin dashboard, seed data) per essere riattivate in futuro.

## Problema

- Attualmente `free` tier ha solo `upload_pdf`, `download_pdf`, `extract_text`
- Per la versione web vogliamo che tutti possano usare merge/split/export/import ecc.
- Modificare il seed per dare tutto a free non basta: `check_feature_access()` è cablata ovunque
- Dobbiamo **bypassare** il controllo senza cancellare la struttura licenze

## Soluzione

Aggiungere un flag `DISABLE_LICENSE_ENFORCEMENT` in `config.py` (Pydantic Settings, leggibile da `.env`).

Quando `True`:

- `check_feature_access()` e `verify_feature_access()` passano sempre (no 403)
- Il seed DB per i test rimane invariato (tutti i tier hanno le loro feature)
- Le feature keys e i tier restano nel codice per futura riattivazione
- Admin dashboard può comunque cambiare tier (struttura pronta)

## Dipendenze

- `backend/app/core/config.py` — Aggiungere `DISABLE_LICENSE_ENFORCEMENT: bool = False`
- `backend/app/api/deps.py` — Modificare `verify_feature_access()` e `check_feature_access()`
- `.env.example` — Documentare il flag

## Output atteso

✅ Dopo implementazione:

1. `DISABLE_LICENSE_ENFORCEMENT=True` in `.env` → tutte le feature sbloccate per tutti
2. `DISABLE_LICENSE_ENFORCEMENT=False` (default) → comportamento attuale (licenze enforceate)
3. Nessuna modifica a modelli/license/user/schemas
4. Test invariati

## Accettazione Criteria

- [ ] `config.py` aggiunge `DISABLE_LICENSE_ENFORCEMENT: bool = False`
- [ ] `deps.py` controlla il flag all'inizio di `check_feature_access()` e `verify_feature_access()`
- [ ] `.env.example` documenta `DISABLE_LICENSE_ENFORCEMENT`
- [ ] Se `True`, tutte le chiamate passano senza interrogare DB
- [ ] Se `False` (default), comportamento invariato
- [ ] Tutti i test passano (test esistenti non modificati)

## Status

- [ ] Non iniziata
- [ ] In progress
- [ ] In review
- [x] ✅ Completata (merged to dev - PR #143)

## Timeline

Stimato: 15 minuti
