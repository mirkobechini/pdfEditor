# Plan: Stabilizzazione post-merge `d84befd` (dev -> main)

**Status:** 🟨 In corso
**Data:** 2026-07-21
**Contesto:** merge massivo `d84befd` (145 commits) con migrazione error handling incompleta su alcuni file.

## Obiettivo

Chiudere in modo definitivo i gap residui su error handling backend/frontend emersi dopo il merge `d84befd`, riducendo regressioni UX e falsi `common.unknownError`.

## Scope

### Backend (error contract)

- [ ] Migrare tutte le `raise HTTPException(...)` residue in route API a `error_response(...)`
  - [ ] `backend/app/api/v1/auth.py`
  - [ ] `backend/app/api/v1/convert.py`
  - [ ] `backend/app/api/v1/upload.py`
- [ ] Verificare che ogni errore business abbia `ErrorCode` stabile e mappabile
- [ ] Eliminare eventuali import duplicati / incoerenze minori

### Frontend (error rendering)

- [x] Fix i18n admin bug reports status (`frontend/src/app/admin/page.tsx`) — issue #374 / branch `hotfix/374-admin-bug-i18n`
- [ ] Rimuovere `err.message` raw dai catch user-facing
  - [ ] `frontend/src/app/components/MetadataDialog.tsx`
  - [ ] `frontend/src/app/components/SplitDialog.tsx` (ramo thumbnail load)
  - [ ] `frontend/src/app/reset-password/page.tsx`
- [ ] Usare `mapError(err)` in modo uniforme

### Test & quality gate

- [ ] Aggiornare/aggiungere test backend per formato errore `{code, detail}` nei path critici
- [ ] Aggiornare/aggiungere test frontend su mapping codici (`GOOGLE_AUTH_FAILED`, `UPLOAD_TOO_LARGE`, `VALIDATION_ERROR`)
- [ ] Eseguire smoke test funzionale minimo:
  - [ ] login email/password
  - [ ] Google SSO fail path
  - [ ] upload/import fail path

## Sequenza issue/branch consigliata (atomica)

1. **Issue A — backend residual HTTPException**
   - Branch: `hotfix/<issue>-backend-error-response-completion`
   - Output: migrazione completa route backend residue + test backend correlati

2. **Issue B — frontend residual raw error message**
   - Branch: `hotfix/<issue>-frontend-maperror-completion`
   - Output: migrazione completa catch UI residue + test frontend correlati

3. **Issue C — smoke test + hardening finale**
   - Branch: `chore/<issue>-post-merge-smoke-tests`
   - Output: check finale, piccoli fix, aggiornamento ADR/CHANGELOG

## Criteri di completamento

- [ ] `grep` su backend route non trova più `raise HTTPException(` per errori business
- [ ] `grep` su frontend user-facing non trova più `err.message` in catch UI
- [ ] Test suite pertinente verde
- [ ] ADR aggiornato con esito finale

## Note operative

- Seguire `AGENT_FLOW.md`: una issue per volta, commit atomici, test subito dopo il codice, CI verde prima di merge.
- Evitare PR jumbo: meglio 2-3 PR piccole e verificabili.

## Progress update

- 2026-07-21: completato fix runtime `MISSING_MESSAGE` in pagina admin bug reports (chiavi `admin.admin.*` -> mapping corretto con `BUG_STATUS_KEYS`).
