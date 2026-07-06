# Chore: Frontend Test Coverage Reporting

**Issue Number**: issue-144

## Obiettivo

Configurare coverage reporting per i test frontend (vitest) con `@vitest/coverage-v8`. Aggiungere script per generare report e integrarli nel workflow di sviluppo.

## Problema

- `vitest run` non ha flag `--coverage`
- Nessuna configurazione coverage in `vitest.config.ts`
- Impossibile misurare code coverage dei test frontend
- Impossibile fare CI gatekeeping (% coverage minima)

## Dipendenze

- `frontend/package.json` — Aggiungere dipendenza dev `@vitest/coverage-v8`
- `frontend/vitest.config.ts` — Aggiungere blocco `coverage: {}`
- `.gitignore` — Aggiungere `coverage/` directory

## Stack

- Frontend: vitest v4 + @vitest/coverage-v8

## Output atteso

✅ Dopo implementazione:

1. `npm run test -- --coverage` genera report coverage
2. `npm run coverage` script in package.json per comodità
3. Coverage exclude: node_modules, .next, setup.ts, test files
4. `coverage/` in .gitignore

## Accettazione Criteria

- [ ] `npm install --save-dev @vitest/coverage-v8`
- [ ] `vitest.config.ts` aggiunge blocco `coverage`
- [ ] `package.json` aggiunge script `"coverage": "vitest run --coverage"`
- [ ] `.gitignore` aggiunge `coverage/`
- [ ] `npm run coverage` produce output text + lcov
- [ ] lcov report genera correttamente

## Status

- [ ] Non iniziata
- [ ] In progress
- [ ] In review
- [ ] Completata

## Timeline

Stimato: 20 minuti

## Note

- Provider: `v8` (più veloce di Istanbul, built-in in Node)
- Include: `src/**` (solo codice applicativo)
- Exclude: setup file, test files, node_modules, .next
- Reporter: text (console) + lcov (per IDE/CI)
- Non impostare soglia minima % per non bloccare il dev — aggiungere in futuro
