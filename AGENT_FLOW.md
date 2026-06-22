# Agent Development Flow

This document outlines the development flow for the PDF Editor project, including the feature flow, branch structure, core principles, and workflow steps.

---

## Branch Structure

| Branch     | Convention                           | Description                                                    |
| ---------- | ------------------------------------ | -------------------------------------------------------------- |
| `main`     | —                                    | Stable codebase. Only the user merges here from `dev`.         |
| `dev`      | —                                    | Permanent development branch. All feature branches merge here. |
| `feature/` | `<issue-number>-<short-description>` | One branch per task / issue.                                   |
| `hotfix/`  | `<issue-number>-<short-description>` | Urgent bug fixes (same flow as feature).                       |
| `chore/`   | `<issue-number>-<short-description>` | Non-feature tasks (refactoring, documentation, etc.).          |

---

## Core Principles

- Each task should be implemented in a separate branch.
- Branch naming convention: `feature/<issue-number>-<short-description>` (e.g., `feature/3-pdf-annotation`).
- Each branch should be created from the `dev` branch. The `dev` branch is a **permanent** branch created from `main` at the start of the project.
- **No merge to the `main` branch without approval from the user.** The user must review and approve the changes before they are merged into `main`.

## NEVER

- Don't commit directly to the `main` branch.
- Don't merge to the `main` branch without approval from the user.
- Don't push to remote. The remote is managed manually by the user.

---

## Workflow Steps

### 1. Plan

- Create an **issue** for every task on GitHub. The issue should contain a detailed description of the task, including any relevant information or resources.

### 2. Branching

main -> dev -> feature/<issue-number>-<short-description>

> ✅ **Initial setup già completato** — il branch `dev` esiste già sia in locale che su remote.

#### Per-feature workflow

```bash
git checkout dev
git checkout -b feature/<issue-number>-<short-description>
```

### 3. Implementation

- **One commit per logical component.** Implement one single component/feature at a time, then commit immediately before moving to the next.
- Commit frequently using descriptive commit messages.
- Do one feature at a time. Change feature only after the previous one is complete and all tests have passed.
- Push only when the user explicitly asks for it.

> **Rule for the AI agent:** Each commit MUST represent ONE single atomic component or feature — one section of the DOM, or one logical JS feature. Do NOT group multiple components in the same commit. After each commit, stop and briefly describe what you did, then wait before proceeding to the next.

### 4. Commit granularity — Prototype (Phase 0)

✅ **Completato.** Table maintained for reference.

| #    | Section                                                             | Commit message    |
| ---- | ------------------------------------------------------------------- | ----------------- |
| 1-20 | Head → Header → Sidebar → Toolbar → Viewer → Modals → Final touches | 20 atomic commits |

### 5. Commit granularity — Phase 1 onward

For subsequent phases, the AI agent MUST follow these guidelines:

- **One commit per atomic API endpoint** (FastAPI) — e.g., one commit for `POST /upload`, one for `POST /merge`, one for `POST /split`
- **One commit per component** (Next.js/React) — e.g., one commit for Sidebar component, one for Toolbar component
- **One commit per integration step** (Tauri/React Native) — e.g., one commit for Tauri setup, one for sidecar config
- After each commit, stop, briefly describe what was done, and wait before proceeding

> ⚠️ **Rule for the AI agent:** This rule applies to ALL phases, not just the prototype. One atomic functionality = one commit. Always.

### 6. Testing strategy

- **Every atomic function MUST have a corresponding test** before being considered complete
- Backend (Python/FastAPI): use **pytest** with `httpx.AsyncClient` for async endpoint testing
- Frontend (React/Next.js): use **vitest** for business logic/hooks, **Playwright** for E2E
- Before advancing from one phase to the next: **ALL tests must be re-run and pass**
- If any test fails, the phase is NOT complete — fix the issue first

### 7. Development order (enforced)

1. **FastAPI backend first** — all endpoints with tests (pytest)
2. **Next.js frontend** — components + pages with tests (vitest)
3. **Tauri wrapper** — desktop app, manual testing by user
4. Only after user approval → Web deploy → Cloud sync → Mobile app

> The AI agent MUST NOT start a phase until the previous phase has been approved by the user.

---

## Commit Message Format

- Use the following format for commit messages:

```
<type>(<scope>): <short description>

Types: feat, fix, style, refactor, test, chore
Scope: The scope of the change (e.g., component, module, etc.)
```

Examples:

```
feat(auth): add login functionality
fix(api): remove deprecated endpoint
style(ui): update button styles
chore(docs): update README with new instructions
refactor(auth): refactor login component for better readability
```

---
