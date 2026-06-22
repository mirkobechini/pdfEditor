# Agent Development Flow

This document outlines the development flow for the PDF Editor project, including the feature flow, branch structure, core principles, and workflow steps.

---

## Branch Structure

| Branch | Convention | Description |
| ------ | ---------- | ----------- |
| `main` | — | Stable codebase. Only the user merges here from `dev`. |
| `dev` | — | Permanent development branch. All feature branches merge here. |
| `feature/` | `<issue-number>-<short-description>` | One branch per task / issue. |
| `hotfix/` | `<issue-number>-<short-description>` | Urgent bug fixes (same flow as feature). |
| `chore/` | `<issue-number>-<short-description>` | Non-feature tasks (refactoring, documentation, etc.). |

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

---

## Workflow Steps

### 1. Plan — Create a GitHub Issue

For every task, the AI agent creates a GitHub issue with:
- **Title**: concise description of the task
- **Body**: detailed description, acceptance criteria, technical notes
- **Labels**: `phase-1a`, `backend`, `frontend`, `tauri`, `mobile`, etc.

The agent uses the `mcp_gitkraken_cli_issues_create` tool to create issues. The issue number determines the branch name.

### 2. Branching

```bash
git checkout dev
git checkout -b feature/<issue-number>-<short-description>
```

Example: issue #2 "FastAPI backend setup" → branch `feature/2-fastapi-backend`

### 3. Implementation

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

### 5. GitHub Actions (CI)

Every push to `dev` or any `feature/*` branch triggers automated tests:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r requirements.txt
      - run: pytest --cov

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run test
```

This CI file is created at the start of Phase 1a as the first commit.

### 6. Testing strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Backend (Python) | **pytest** + `httpx.AsyncClient` | API endpoint testing |
| Frontend (React) | **vitest** | Business logic, hooks |
| Integration | **Playwright** | E2E user flows |

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
