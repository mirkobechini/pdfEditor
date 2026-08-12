# Chore: Create CHANGELOG.md and Slim Down ADR

**Status:** ✅ Completata (2026-07-12, PR #224)
**Priority:** BASSA (Documentation)
**Complexity:** Low
**Estimated Time:** 30 min

---

## Problema

L'ADR.md è cresciuto fino a ~430 linee. La sezione "Bug tracker" contiene decine di fix storici (PR #66, #68, #70, ecc.) che ormai sono solo rumore. Chi legge l'ADR per capire l'architettura deve scorrere pagine di changelog.

## Soluzione

1. **Creare `CHANGELOG.md`** con tutti i fix storici
2. **Sostituire la sezione "Bug tracker" in ADR.md** con un link a `CHANGELOG.md`
3. **Mantenere in ADR solo** le decisioni architetturali, vincoli, e stato attuale

## Struttura CHANGELOG.md

```markdown
# Changelog

## 2026-07-11
- ✅ CSRF protection middleware (PR #214)
- ✅ JWT httpOnly cookie (PR #216)
- ✅ Frontend test fixes (108 test, 0 failures)
- ...

## 2026-07-10
- ✅ User dashboard (PR #198)
- ✅ Admin license restrictions (PR #196)
- ✅ Metadata pre-populate fix (PR #194)
- ...

## 2026-07-09
- ✅ Security audit fixes (PR #176-#182)
- ...
```

## Files da creare

- `CHANGELOG.md`

## Files da modificare

- `ADR.md` — Sostituire "Bug tracker" con link a CHANGELOG.md

## Acceptance Criteria

- [ ] ADR.md ridotto del 50%+
- [ ] CHANGELOG.md contiene tutti i fix
- [ ] Link funzionante tra ADR e CHANGELOG