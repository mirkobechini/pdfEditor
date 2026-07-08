# Chore: Move Admin Email to .env Configuration

**Issue Number**: issue-139

## Obiettivo

Spostare la mail admin `SUPER_ADMIN_EMAIL` da hardcoded in `config.py` a parametro configurabile via `.env`. Migliorare security, flexibility e preparare per deployment multi-ambiente (dev/staging/production).

## Problema

Attualmente:

```python
# backend/app/core/config.py
SUPER_ADMIN_EMAIL: str = "mirkobechini@gmail.com"  # Hardcoded!
```

**Rischi:**

- Mail esposta in git history (security issue)
- Non configurabile senza modifica codice
- Difficile da cambiare per staging/production
- Incompatibile con Tauri sidecar che legge .env locale

## Dipendenze

- `backend/app/core/config.py` - Settings Pydantic model
- `backend/app/main.py` - Startup che crea super admin
- `.env` - Configuration file (non committato)
- `.env.example` - Template documentation

## Stack

- Backend: FastAPI + Pydantic settings
- Python: 3.10+

## Output atteso

✅ Dopo implementazione:

1. `SUPER_ADMIN_EMAIL` letto da `.env` oppure con default `"admin@pdfeditor.local"`
2. `.env.example` documenta `SUPER_ADMIN_EMAIL=mirkobechini@gmail.com`
3. `.env` locale (non committato) contiene mail di dev
4. Backend startup legge correttamente da `.env`
5. Non cambia comportamento della app (backward compatible)

## Accettazione Criteria

- [ ] `.env.example` creato con tutti i parametri configurabili
- [ ] `config.py` aggiornato: `SUPER_ADMIN_EMAIL` legge da env con default
- [ ] `.gitignore` verifica che `.env` non sia committato
- [ ] `.env` locale aggiornato per testing
- [ ] Backend startup test: verifica che super admin sia creato correttamente
- [ ] Git history non espone mail sensibili

## Status

- [ ] Non iniziata
- [ ] In progress
- [ ] In review
- [x] ✅ Completata (merged to dev - PR #136)

## Timeline

Stimato: 30 minuti

## Note

- Non modificare `main.py` (già usa `settings.SUPER_ADMIN_EMAIL` ✅)
- Non modificare logica di creazione super admin
- Questo è un pure configuration change, non modifica comportamento
- `.env` NON deve essere committato (assicurare via `.gitignore`)

## File da Modificare

1. **Creare** `backend/.env.example`
   - Documentare tutti i parametri configurabili
   - Include `SUPER_ADMIN_EMAIL=mirkobechini@gmail.com`

2. **Modify** `backend/app/core/config.py`
   - Cambiare `SUPER_ADMIN_EMAIL` da hardcoded a parametrizzato
   - Aggiungere default sensato (`"admin@pdfeditor.local"`)

3. **Update** `backend/.env` (se esiste)
   - Aggiungere `SUPER_ADMIN_EMAIL=mirkobechini@gmail.com`

4. **Verify** `backend/.gitignore`
   - `.env` deve essere ignorato ✅

## Implementation Details

**Pattern Pydantic:**

```python
# Prima (hardcoded)
SUPER_ADMIN_EMAIL: str = "mirkobechini@gmail.com"

# Dopo (from .env with default)
SUPER_ADMIN_EMAIL: str = "admin@pdfeditor.local"
# Pydantic leggerà da env: os.getenv("SUPER_ADMIN_EMAIL")
```

**Commit plan:**

1. `chore: create .env.example with admin email config`
2. `chore: move SUPER_ADMIN_EMAIL from hardcoded to .env (issue-139)`
3. `chore: update backend .env for local development`

---

**Procediamo con implementation?** 🚀

---

## Implementation Details

**Files created/modified:**

- `backend/.env.example` - Configuration template (new, committed)
- `backend/app/core/config.py` - Parametrized admin email (modified)
- `backend/.env` - Local dev config (created, not committed — in .gitignore)

**Commits merged:** 3 atomic commits (PR #136)

1. `chore: add plan for admin email env configuration (issue-139)`
2. `chore: create .env.example with admin email config (issue-139)`
3. `chore: move SUPER_ADMIN_EMAIL from hardcoded to .env config (issue-139)`
