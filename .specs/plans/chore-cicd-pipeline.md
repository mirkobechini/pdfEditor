# Chore: CI/CD Pipeline — GitHub Actions per test automatici e deploy

**Status:** Planning
**Priority:** MEDIA (Infrastructure)
**Complexity:** Medium
**Estimated Time:** 2-3 ore

---

## Obiettivo

Creare una pipeline CI/CD con GitHub Actions che:

1. **Esegue test backend** (pytest) su ogni push e PR verso `dev`
2. **Esegue test frontend** (vitest) su ogni push e PR verso `dev`
3. **Blocca il merge** se anche un solo test fallisce
4. **Genera report coverage** per backend e frontend
5. **Deploy automatico su Render** quando si merge su `main`

## Pipeline

### 1. Workflow: `test-backend.yml`

```yaml
name: Backend Tests

on:
  push:
    branches: [dev, main]
    paths: ["backend/**"]
  pull_request:
    branches: [dev, main]
    paths: ["backend/**"]

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run tests with coverage
        run: |
          pytest tests/ --cov=app --cov-report=term --cov-report=xml -q

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: backend/coverage.xml
          flags: backend
```

### 2. Workflow: `test-frontend.yml`

```yaml
name: Frontend Tests

on:
  push:
    branches: [dev, main]
    paths: ["frontend/**"]
  pull_request:
    branches: [dev, main]
    paths: ["frontend/**"]

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit 2>&1 || true

      - name: Run tests
        run: npx vitest run --reporter=verbose

      - name: Run coverage
        run: npx vitest run --coverage --reporter=text
```

### 3. Deploy su Render

Render ha deploy automatico via Git. Basta configurare:

- `main` branch → produzione
- `dev` branch → preview (opzionale)

Su dashboard.render.com:

1. Backend: Settings → Auto-Deploy: Yes
2. Frontend: Settings → Auto-Deploy: Yes

## Files da creare

- `.github/workflows/test-backend.yml`
- `.github/workflows/test-frontend.yml`
- `.github/workflows/deploy.yml` (opzionale, Render gestisce auto-deploy)

## Branch protection rules

Su GitHub, per il branch `main`:

| Regola                         | Valore |
| ------------------------------ | ------ |
| Require pull request reviews   | ✅     |
| Require status checks          | ✅     |
| Status check: "Backend Tests"  | ✅     |
| Status check: "Frontend Tests" | ✅     |
| Require branches up to date    | ✅     |
| Do not allow bypass            | ✅     |

## Acceptance Criteria

- [ ] Backend test workflow funziona
- [ ] Frontend test workflow funziona
- [ ] Se test falliscono, PR bloccata
- [ ] Coverage report generato
- [ ] Merge su main triggera deploy su Render
