# Agent Development Flow

This document outlines the development flow for the PDF Editor project, including the feature flow, branch structure, core principles, and workflow steps.

---

## Branch Structure

| Branch     | Convention                           | Description                                                       |
| ---------- | ------------------------------------ | ----------------------------------------------------------------- |
| `main`     | —                                    | Stable codebase. Only the user merges here from `dev`.            |
| `dev`      | —                                    | Permanent development branch. All phase branches merge here.      |
| `feature/` | `<issue-number>-<short-description>` | Legacy — used only for single-issue branches (prototype Phase 0). |
| `hotfix/`  | `<issue-number>-<short-description>` | Urgent bug fixes (same flow as feature).                          |
| `chore/`   | `<issue-number>-<short-description>` | Non-feature tasks (refactoring, documentation, etc.).             |

---

## Core Principles

- Each task should be implemented in a separate branch.
- Branch naming convention: `feature/<issue-number>-<short-description>` for every issue.
- Each feature branch should be created from the `dev` branch. The `dev` branch is a **permanent** branch created from `main` at the start of the project.
- **No merge to the `main` branch without approval from the user.** The user must review and approve the changes before they are merged into `main`.

## NEVER

- Don't commit directly to the `main` branch.
- Don't merge to the `main` branch without approval from the user.
- Don't push without a reason (CI, sync, or user request).
- Don't create a branch without an associated GitHub issue.
- Don't go to the next issue without all tests passing and user approval of the previous issue.

---

## Workflow Steps

### 1. Plan — Create a GitHub Issue

For every **feature**, the AI agent creates a GitHub issue with:

- **Title**: concise feature description
- **Body**: detailed description, acceptance criteria, technical notes, security checklist
- **Labels**: `backend`, `frontend`, `tauri`, `mobile`

Each feature from the BRIEF gets its own issue. Examples:

| Feature                 | Issue |
| ----------------------- | ----- |
| API upload/download PDF | #2    |
| API merge/split PDF     | #3    |
| API text editing        | #4    |
| ...                     | ...   |
| PDF viewer component    | #?    |
| Sidebar component       | #?    |
| Tauri shell setup       | #?    |
| Sidecar FastAPI         | #?    |

The agent uses the `mcp_gitkraken_cli_issues_create` tool to create issues. The issue number determines the branch name.

### 2. Branching — one branch per issue

Each **issue** gets its own branch.

```bash
# Create and push issue branch (CI needs push to trigger tests)
git checkout dev
git checkout -b feature/<issue-number>-<short-description>
git push origin feature/<issue-number>-<short-description>
```

Examples:

| Branch                 | Issues | What it contains      |
| ---------------------- | ------ | --------------------- |
| `feature/2-upload-pdf` | #2     | Upload PDF endpoint   |
| `feature/3-merge-pdf`  | #3     | Merge PDF endpoint    |
| `feature/4-edit-text`  | #4     | Text editing endpoint |

### 3. Implementation — one commit per atomic function

For each issue inside the feature branch:

```bash
# Already inside the feature branch (pushed)
git checkout feature/<issue-number>-<short-description>

# Implement the feature + tests
# Commit:
git commit -m "feat(api): add POST /upload endpoint"

# Push to trigger CI (Superlinter + tests run automatically)
git push origin feature/<issue-number>-<short-description>

# Create Pull Request (CI gating)
gh pr create --base dev --title "feat(api): add POST /upload endpoint" --body "closes #<issue-number>"

# Wait for CI to pass, then squash-merge:
gh pr merge --squash --delete-branch

# Switch back to dev and sync
git checkout dev
git pull origin dev
# Delete local branch (remote already deleted by --delete-branch)
git branch -d feature/<issue-number>-<short-description>
```

> ⚠️ When the PR is merged via `gh pr merge --squash`, GitHub auto-closes the issue because the PR body contains `closes #N`. The commit message in the squash commit is derived from the PR title, not the individual commit messages.

### 4. Implementation

- **One commit per atomic function.** Each commit = one function, one API endpoint, one React component, one test file.
- **Migration**: ogni volta che crei o modifichi un modello SQLAlchemy, genera la migration Alembic:
  ```bash
  alembic revision --autogenerate -m "add <table_name> table"
  ```
  La migration va committata insieme al modello (`alembic/versions/xxx.py`), prima dei test. Se non ci sono modifiche ai modelli, non serve migration.
- Commit messages MUST be clear, but `closes #N` goes in **the PR body**, not the commit message:

  ```
  # commit message
  feat(api): add POST /upload endpoint

  # PR body (via --body flag)
  closes #2
  ```

- After each commit, stop, briefly describe what was done, and wait before proceeding.
- Dopo il push, crea una **Pull Request** con `gh pr create` e attendi CI verde prima di fare `gh pr merge`.
- **Security checklist**: prima di considerare completata una funzione, verificare:
  - [ ] I file caricati superano i controlli magic bytes?
  - [ ] I nomi file sono sanitizzati con UUID?
  - [ ] C'è un timeout su operazioni lunghe?
  - [ ] L'input è validato con Pydantic schema?
  - [ ] I test coprono anche i casi edge di sicurezza (file malformati, path traversal)?

### 5. Backend architecture pattern (FastAPI)

Equivalent to MVC in Laravel. Controllers (routers) do NOT contain validation — that goes in schemas.

```
backend/
├── app/
│   ├── api/              # Router (≈ Controller) — solo routing
│   │   ├── v1/
│   │   │   ├── upload.py
│   │   │   ├── merge.py
│   │   │   ├── split.py
│   │   │   ├── text.py
│   │   │   ├── metadata.py
│   │   │   ├── convert.py
│   │   │   └── auth.py
│   │   └── deps.py       # Dipendenze (get_current_user, get_db)
│   ├── schemas/          # Pydantic (≈ FormRequest) — validazione
│   │   ├── pdf.py
│   │   ├── auth.py
│   │   └── sync.py
│   ├── models/           # SQLAlchemy (≈ Eloquent Model)
│   │   ├── pdf.py
│   │   ├── user.py
│   │   └── sync.py
│   ├── services/         # Logica di business
│   │   ├── pdf_service.py
│   │   ├── auth_service.py
│   │   └── sync_service.py
│   ├── repositories/     # Accesso DB
│   │   ├── pdf_repo.py
│   │   └── user_repo.py
│   ├── core/             # Config, security, database
│   │   ├── config.py
│   │   ├── security.py
│   │   ├── database.py
│   │   └── storage.py
│   └── main.py
├── tests/
│   ├── conftest.py
│   ├── test_upload.py
│   ├── test_merge.py
│   ├── test_split.py
│   └── ...
├── alembic/              # Migrations (≈ Laravel Migrations)
│   ├── versions/
│   └── env.py
├── requirements.txt
└── pyproject.toml
```

**Rules:**

- **Router** = solo mapping URL → funzione. Massimo 5 righe per handler
- **Schema (Pydantic)** = validazione input/output. Ogni endpoint ha il suo schema
- **Service** = logica di business. Testabile isolatamente
- **Repository** = query SQLAlchemy. Testabile con mock
- **Model** = definizione tabella. Nessuna logica di business

### 6. GitHub Actions (CI + Superlinter + Security)

Every push to any `feature/*` branch or `dev` triggers CI **automatically**. If CI fails, the feature branch CANNOT be merged into `dev`. This is called **gating**.

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  # Superlinter — linting code quality
  lint:
    name: Superlinter
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Super-linter
        uses: super-linter/super-linter@v7
        env:
          VALIDATE_ALL_CODEBASE: true
          DEFAULT_BRANCH: dev
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          VALIDATE_PYTHON_FLAKE8: true
          VALIDATE_PYTHON_PYLINT: true
          VALIDATE_JAVASCRIPT_ES: true
          VALIDATE_TYPESCRIPT_ES: true
          VALIDATE_HTML: true
          VALIDATE_CSS: true
          VALIDATE_YAML: true
          VALIDATE_MARKDOWN: true

  # Security — Python vulnerability scan
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-python@v6
        with: { python-version: "3.12" }
      - run: pip install bandit pip-audit
      - run: bandit -r app/ -ll # Scan solo criticità medie/alte
      - run: pip-audit # Check CVE nelle dipendenze

  # Type check — mypy (strict)
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-python@v6
        with: { python-version: "3.12" }
      - run: pip install -r requirements.txt
      - run: mypy app/ --strict

  # Backend tests — active in Phase 1a
  backend:
    runs-on: ubuntu-latest
    if: startsWith(github.head_ref, 'feature/') || github.ref_name == 'dev'
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-python@v6
        with: { python-version: "3.12" }
      - run: pip install -r requirements.txt
      - run: pytest --cov --cov-report=term-missing -v

  # Frontend tests — active from Phase 1b onward
  frontend:
    runs-on: ubuntu-latest
    if: startsWith(github.head_ref, 'feature/') || github.ref_name == 'dev'
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with: { node-version: "22" }
      - run: npm ci
      - run: npm run test -- --coverage
```

### 7. Best practices (enforced by Superlinter + conventions)

| Rule                   | Description                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| **Code style Python**  | PEP8 via flake8 + pylint. Docstring obbligatoria su ogni funzione pubblica                           |
| **Code style JS/TS**   | ESLint + Prettier. Arrow functions preferite, nomi camelCase                                         |
| **Type hints Python**  | Obbligatori su tutte le funzioni. MyPy in CI                                                         |
| **TypeScript**         | Strict mode. Nessun `any` senza commento                                                             |
| **Security**           | Seguire la **security checklist** nella sezione 4 (Implementation). Riferimento completo in BRIEF.md |
| **File naming**        | Python: snake_case. React: PascalCase per componenti, camelCase per utility                          |
| **Error handling**     | Ogni endpoint deve gestire errori 400/404/500 con messaggi descrittivi                               |
| **No secrets in code** | Usare variabili d'ambiente. Mai hardcode API key o password                                          |

### 8. CI gates by phase

| Phase              | CI jobs                                          | Lighthouse                                                 |
| ------------------ | ------------------------------------------------ | ---------------------------------------------------------- |
| **1a** (FastAPI)   | Superlinter + bandit + pip-audit + mypy + pytest | ❌                                                         |
| **1b** (Next.js)   | Superlinter + bandit + vitest + Playwright       | 🟡 Consigliato su localhost                                |
| **1c** (Tauri)     | Superlinter + Tauri build check + vitest         | ❌                                                         |
| **2** (Web cloud)  | Tutti i precedenti + Lighthouse CI               | ✅ **Obbligatorio** (performance, PWA, SEO, accessibilità) |
| **3** (Cloud sync) | Tutti i precedenti                               | ✅ Obbligatorio                                            |
| **4** (Mobile)     | Tutti i precedenti + Detox/Maestro E2E           | ❌ (mobile nativo)                                         |

### 9. Testing strategy

| Layer            | Tool                             | Scope                                  |
| ---------------- | -------------------------------- | -------------------------------------- |
| Backend (Python) | **pytest** + `httpx.AsyncClient` | API endpoint testing                   |
| Frontend (React) | **vitest**                       | Business logic, hooks                  |
| Integration      | **Playwright**                   | E2E user flows                         |
| Security Python  | **bandit** + **pip-audit**       | Vulnerability scan                     |
| Type checking    | **mypy** (strict)                | Type hints enforcement                 |
| Web audit        | **Lighthouse CI**                | Performance, PWA, SEO, a11y (Phase 2+) |

- **Every atomic function MUST have a corresponding test** before being considered complete
- **Every push triggers CI automatically** — if CI fails, the phase branch CANNOT be merged into `dev`
- Before advancing from one phase to the next: **ALL tests must pass on CI**
- If any test fails, the phase is NOT complete — fix the issue first

### 10. Development order

```
Phase 1a: FastAPI backend → pytest ✅ → user approves
Phase 1b: Next.js frontend → vitest ✅ → user approves
Phase 1c: Tauri desktop → manual test ✅ → user approves
Phase 2:   Web deploy (Next.js + FastAPI cloud)
Phase 3:   Cloud sync (SQLite ↔ PostgreSQL)
Phase 4:   Mobile app (React Native)
```

> Per la lista completa delle issue di ogni fase, consultare [BRIEF.md](./BRIEF.md).

> The AI agent MUST NOT start a phase until the previous phase has been approved by the user. Approval is given via chat (e.g., "ok, procedi").

## Hotfix workflow

For urgent fixes directly on `dev` or `main`:

```bash
git checkout dev
git checkout -b hotfix/<issue-number>-<short-description>
# fix + commit + push
git commit -m "fix(scope): short description"
git push origin hotfix/<issue-number>-<short-description>
# create PR for CI gating
gh pr create --base dev --title "fix(scope): short description" --body "closes #N"
# wait for CI, then squash-merge
gh pr merge --squash --delete-branch
git checkout dev
git pull origin dev
git branch -d hotfix/<issue-number>-<short-description>
```

---

## Commit Message Format

```
<type>(<scope>): <short description>

Types: feat, fix, style, refactor, test, chore
Scope: api, ui, tauri, sync, ci, docs
```

Always put `closes #<issue-number>` in the **PR body** (not the commit message), so GitHub auto-closes the issue on squash-merge.

Examples:

```
# commit message
feat(api): add POST /upload endpoint

# PR body
closes #2

# commit message
test(api): add pytest for /upload endpoint

# commit message
fix(ui): correct page navigation on edge case

# PR body
closes #5
```
