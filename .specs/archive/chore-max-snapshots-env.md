# Chore: Make MAX_SNAPSHOTS Configurable via .env

**Status:** ✅ Completata (2026-07-02)

**Issue Number**: issue-140

## Obiettivo

Spostare `MAX_SNAPSHOTS = 10` da costante hardcoded in `storage.py` a parametro configurabile via `.env` (Pydantic Settings), seguendo il pattern già usato per `SUPER_ADMIN_EMAIL` (#139) e `MAX_UPLOAD_SIZE_MB`.

## Problema

Attualmente:

```python
# backend/app/core/storage.py — linea 58
MAX_SNAPSHOTS = 10
```

**Rischi:**

- Non modificabile senza editare codice
- Non differenziabile per ambiente (dev/staging/prod)
- Rotto il pattern dichiarato in ADR.md ("configurabile" ma non lo è)

## Dipendenze

- `backend/app/core/config.py` — Aggiungere `MAX_SNAPSHOTS` a Settings
- `backend/app/core/storage.py` — Leggere da `settings.MAX_SNAPSHOTS`
- `backend/.env.example` — Documentare il parametro

## Stack

- Backend: FastAPI + Pydantic Settings

## Output atteso

✅ Dopo implementazione:

1. `settings.MAX_SNAPSHOTS` disponibile in Pydantic
2. `storage.py` importa `settings` e usa `settings.MAX_SNAPSHOTS`
3. `.env.example` documenta `MAX_SNAPSHOTS=10`
4. Backward compatible (default = 10)

## Accettazione Criteria

- [ ] Config.py aggiunge `MAX_SNAPSHOTS: int = 10`
- [ ] Storage.py importa settings e usa `settings.MAX_SNAPSHOTS`
- [ ] `.env.example` aggiornato con `MAX_SNAPSHOTS=10`
- [ ] Test: verifica che storage.py usi settings.MAX_SNAPSHOTS (test esistente passa)

## Status

- [ ] Non iniziata
- [ ] In progress
- [ ] In review
- [x] ✅ Completata (merged to dev - PR #138)

## Timeline

Stimato: 20 minuti

## Note

- Pattern identico a #139
- Nessun test nuovo necessario (costante sostituita da settings, stesso comportamento)
- Comportamento invariato se `.env` non specifica il valore
