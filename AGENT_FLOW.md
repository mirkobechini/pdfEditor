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
- Don't push to remote. Push only after review and approval to open a Pull Request.

---

## Workflow Steps

### 1. Plan

- Create an **issue** for every task on GitHub. The issue should contain a detailed description of the task, including any relevant information or resources.

### 2. Branching

main -> dev -> feature/<issue-number>-<short-description>

#### Initial setup (one-time only)

```bash
git checkout main
git checkout -b dev
git push origin dev
```

#### Per-feature workflow

```bash
git checkout dev
git pull origin dev
git checkout -b feature/<issue-number>-<short-description>
```

### 3. Implementation

- Commit frequently using descriptive commit messages.
- Do one feature at a time. Change feature only after the previous one is complete and all tests have passed.
- Do NOT push until all tests have passed and review is complete.

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