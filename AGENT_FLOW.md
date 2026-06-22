# Agent Development Flow

This document outlines the development flow for the PDF Editor project, including the feature flow, branch structure, core principles, and workflow steps.

---

## Branch Structure

| Branch     | Convention                           | Description                                                                                    |
| ---------- | ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `main`     | —                                    | Stable codebase. Only the user merges here from `dev`.                                         |
| `dev`      | —                                    | Permanent development branch. All phase branches merge here.                                   |
| `phase/`   | `<phase-name>`                       | One branch per **phase** (e.g. `phase/1a-fastapi-backend`). Contains all issues of that phase. |
| `feature/` | `<issue-number>-<short-description>` | Legacy — used only for single-issue branches (prototype Phase 0).                              |
| `hotfix/`  | `<issue-number>-<short-description>` | Urgent bug fixes (same flow as feature).                                                       |
| `chore/`   | `<issue-number>-<short-description>` | Non-feature tasks (refactoring, documentation, etc.).                                          |

---

## Core Principles

- Each task should be implemented in a separate branch.
- Branch naming convention: `feature/<issue-number>-<short-description>` (e.g., `feature/3-pdf-annotation`).
- Each branch should be created from the `dev` branch. The `dev` branch is a **permanent** branch created from `main` at the start of the project.
- **No merge to the `main` branch without approval from the user.** The user must review and approve the changes before they are merged into `main`.

## NEVER

- Don't commit directly to the `main` branch.
- Don't merge to the `main` branch without approval from the user.
- Don't push without a reason (CI, sync, or user request).
- Don't create a branch without an associated GitHub issue.
- Don't go to the next phase without all tests passing and user approval of the previous phase.

---

## Workflow Steps

### 1. Plan — Create a GitHub Issue

For every **feature** (not phase), the AI agent creates a GitHub issue with:

- **Title**: concise feature description
- **Body**: detailed description, acceptance criteria, technical notes, security checklist
- **Labels**: `backend`, `frontend`, `tauri`, `mobile`, plus a phase label (`phase-1a`, `phase-1b`, etc.)

Each feature from the BRIEF gets its own issue. Examples:

| Feature                 | Issue | Phase label |
| ----------------------- | ----- | ----------- |
| API upload/download PDF | #2    | `phase-1a`  |
| API merge/split PDF     | #3    | `phase-1a`  |
| API text editing        | #4    | `phase-1a`  |
| ...                     | ...   | ...         |
| PDF viewer component    | #?    | `phase-1b`  |
| Sidebar component       | #?    | `phase-1b`  |
| Tauri shell setup       | #?    | `phase-1c`  |
| Sidecar FastAPI         | #?    | `phase-1c`  |

The agent uses the `mcp_gitkraken_cli_issues_create` tool to create issues. The issue number determines the branch name.

### 2. Branching — one branch per phase

Each **phase** gets its own branch. All feature issues of that phase are implemented inside the same branch.

```bash
git checkout dev
git checkout -b phase/<phase-name>
```

Examples:

| Branch                     | Issues                         | What it contains          |
| -------------------------- | ------------------------------ | ------------------------- |
| `phase/1a-fastapi-backend` | #2, #3, #4, #5, #6, #7, #8, #9 | All backend API endpoints |
| `phase/1b-nextjs-frontend` | #10, #11, ...                  | All React components      |
| `phase/1c-tauri-desktop`   | ...                            | Tauri wrappering          |

### 3. Per-feature workflow inside a phase branch

For each issue inside the phase branch:

```bash
# Already inside the phase branch
git checkout phase/1a-fastapi-backend

# Implement the feature + tests
# Commit with auto-close reference:
git commit -m "feat(api): add POST /upload endpoint\n\ncloses #2"

# When all issues in the phase are done, merge into dev
git checkout dev
git merge phase/1a-fastapi-backend
```

> Multiple `closes #N` in different commits within the same branch will auto-close each issue individually when the branch is merged into `dev`.

### 4. Implementation

- **One commit per atomic function.** Each commit = one API endpoint, one React component, one test file.
- Commit messages MUST reference the issue for auto-close on merge:
  ```
  feat(api): add POST /upload endpoint
  closes #2
  ```
- After each commit, stop, briefly describe what was done, and wait before proceeding.

> ⚠️ When the feature branch is merged into `dev`, GitHub auto-closes the issue because the commit message contains `closes #N`.

### 4. Backend architecture pattern (FastAPI)

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

### 5. GitHub Actions (CI + Superlinter)

Every push to `dev` or any `feature/*` branch triggers:

1. **Superlinter** — linting automated di tutti i linguaggi
2. **Test** — pytest (backend) + vitest (frontend) + Playwright (E2E)

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

  # Backend tests
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r requirements.txt
      - run: pytest --cov --cov-report=term-missing

  # Frontend tests
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: npm run test -- --coverage
```

### 6. Best practices (enforced by Superlinter + conventions)

| Rule                   | Description                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| **Code style Python**  | PEP8 via flake8 + pylint. Docstring obbligatoria su ogni funzione pubblica                 |
| **Code style JS/TS**   | ESLint + Prettier. Arrow functions preferite, nomi camelCase                               |
| **Type hints Python**  | Obbligatori su tutte le funzioni. MyPy in CI                                               |
| **TypeScript**         | Strict mode. Nessun `any` senza commento                                                   |
| **Security**           | Seguire la checklist in BRIEF.md (magic bytes, UUID storage, timeout, Pydantic validation) |
| **File naming**        | Python: snake_case. React: PascalCase per componenti, camelCase per utility                |
| **Error handling**     | Ogni endpoint deve gestire errori 400/404/500 con messaggi descrittivi                     |
| **No secrets in code** | Usare variabili d'ambiente. Mai hardcode API key o password                                |

### 6. Testing strategy

| Layer            | Tool                             | Scope                 |
| ---------------- | -------------------------------- | --------------------- |
| Backend (Python) | **pytest** + `httpx.AsyncClient` | API endpoint testing  |
| Frontend (React) | **vitest**                       | Business logic, hooks |
| Integration      | **Playwright**                   | E2E user flows        |

- **Every atomic function MUST have a corresponding test** before being considered complete
- Before advancing from one phase to the next: **ALL tests must pass on CI**
- If any test fails, the phase is NOT complete

### 7. Development order

```
Phase 1a: FastAPI backend → pytest ✅ → user approves
Phase 1b: Next.js frontend → vitest ✅ → user approves
Phase 1c: Tauri desktop → manual test ✅ → user approves
Phase 2:   Web deploy (Next.js + FastAPI cloud)
Phase 3:   Cloud sync (SQLite ↔ PostgreSQL)
Phase 4:   Mobile app (React Native)
```

> The AI agent MUST NOT start a phase until the previous phase has been approved by the user. Approval is given via chat (e.g., "ok, procedi").

---

## Commit Message Format

```
<type>(<scope>): <short description>

Types: feat, fix, style, refactor, test, chore
Scope: api, ui, tauri, sync, ci, docs
```

Always append `closes #<issue-number>` when the commit completes the issue.

Examples:

```
feat(api): add POST /upload endpoint
closes #2

test(api): add pytest for /upload endpoint

fix(ui): correct page navigation on edge case
closes #5
```
