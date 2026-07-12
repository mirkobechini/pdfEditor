# Agent Development Flow

This document defines the **git workflow** that the AI agent must follow for every project. It covers branching, committing, pull requests, and the overall issue lifecycle.

---

## Branch Structure

| Branch     | Convention                           | Description                                                  |
| ---------- | ------------------------------------ | ------------------------------------------------------------ |
| `main`     | —                                    | Stable codebase. Only the user merges here from `dev`.       |
| `dev`      | —                                    | Permanent development branch. All phase branches merge here. |
| `feature/` | `<issue-number>-<short-description>` | New features (one branch per issue).                         |
| `hotfix/`  | `<issue-number>-<short-description>` | Urgent bug fixes (same flow as feature).                     |
| `chore/`   | `<issue-number>-<short-description>` | Non-feature tasks (refactoring, documentation, etc.).        |

---

## Core Principles

- **One branch per issue.** Branch naming: `feature/<issue-number>-<short-description>`.
- Every feature branch is created from `dev`. `dev` is a permanent branch created from `main` at project start.
- **No merge to `main` without user approval.**

## NEVER

- Do not commit directly to `main`.
- Do not merge to `main` without user approval.
- Do not push without a reason (CI must run, sync with remote, or user explicitly requests it).
- Do not create a branch without an associated issue.
- Do not proceed to the next issue without all tests passing and user approval of the previous one.
- **Never create or modify files without committing before proceeding.** Each atomic unit (a model, a service, a route handler, a test file, etc.) must be committed before writing the next file. The only exception is when editing the same file multiple times in quick succession for the same feature (e.g., fixing a bug discovered in the same session).
- **Never create an issue or branch that covers multiple task items.** Each task item is ONE separate issue + ONE separate branch.
- **Never group multiple bugs into a single issue.** Each bug fix gets its own issue, branch, and PR.
- **Every feature MUST include its own tests before the PR is created.** A feature is not complete until its tests are written AND pass. CI must be green before merge.
- **Never batch multiple atomic units into a single commit.** Each commit MUST contain exactly ONE logical unit: one model, one schema file, one service, one route file, one test file. Commits like "feat: add service + routes + registration" are NOT allowed — that's three separate commits.
- **Exception for mass refactoring (>5 files with identical mechanical change):** When the same mechanical change (e.g. renaming a hook, changing a function signature) touches more than 5 files, the agent MUST ask the user before proceeding: _"Questo refactoring tocca N file con la stessa modifica meccanica. Preferisci un commit bulk approvato o il flusso one-by-one?"_ If the user approves bulk mode, a single commit is allowed but MUST group changes logically (components in one commit, tests in a separate one).
- **Never skip asking when in doubt.** If unsure about any decision (architecture, implementation, naming, rule interpretation), ask the user BEFORE proceeding. After the user answers, immediately update this file with the outcome.
- **Never ask the user what to do next.** The sequential order is defined in the project's task list — follow it without asking. Do not propose skipping or reordering.
- **Always ask for approval before starting a new issue.** After completing an issue (tests passing, PR merged, issue closed), briefly describe what was done and ask _"May I proceed with the next issue?"_ — do NOT start the next issue without user confirmation.

---

## Workflow Steps

### 1. Plan — Create an Issue

For every **feature**, create an issue with:

- **Title**: concise feature description
- **Body**: detailed description, acceptance criteria, technical notes
- **Labels**: relevant labels (e.g. `backend`, `frontend`, `bug`)

Use the `mcp_gitkraken_cli_issues_create` tool (or project's issue tracker). The issue number determines the branch name.

> **Right after creating the issue**, write in the issue body the **complete list of expected atomic commits** (e.g. `feat(api): add User model`, `feat(api): add POST /auth/register`, `test(api): add auth tests`). This list serves as a roadmap — each commit must be executed exactly as planned before moving to the next. If an extra commit becomes necessary during implementation, add it to the list.

### 2. Branching — one branch per issue

```bash
git checkout dev
git checkout -b feature/<issue-number>-<short-description>
git push origin feature/<issue-number>-<short-description>
```

### 3. Implementation & commit loop

While inside the feature branch, implement **one atomic unit at a time**, **commit immediately**, then move to the next unit.

An **atomic unit** is a single file or logical change: a component, a utility, a test file, a translation update. Do NOT batch multiple files into one commit.

> ⚠️ **Regola fondamentale: ogni implementazione DEVE avere i suoi test.**
> Dopo ogni atomic commit di codice (`feat:`, `fix:`, `refactor:`), il commit **successivo** DEVE essere il test corrispondente (`test:`).
> Esempio: se aggiungi un endpoint, il commit dopo è il test di quell'endpoint.
> Non si passa al prossimo atomic unit senza che il test del precedente sia scritto E passi.

```bash
# Inside the feature branch
git checkout feature/<issue-number>-<short-description>

# === SUBTASK 1: Write file A ===
# Write ONE file (e.g. a component)
# Stage and commit immediately
git add <file-A>
git commit -m "<type>(<scope>): <description of file A>"
git push origin feature/<issue-number>-<short-description>

# === SUBTASK 1b: Write tests for file A ===
# Write tests for the code just committed
git add <test-file-A>
git commit -m "test(<scope>): <description of test file A>"
git push origin feature/<issue-number>-<short-description>
# Run tests to verify they pass
pytest <test-file-A> -q

# === SUBTASK 2: Write file B ===
# Write ONE file (e.g. a service)
git add <file-B>
git commit -m "<type>(<scope>): <description of file B>"
git push origin feature/<issue-number>-<short-description>

# === SUBTASK 2b: Write tests for file B ===
git add <test-file-B>
git commit -m "test(<scope>): <description of test file B>"
git push origin feature/<issue-number>-<short-description>
pytest <test-file-B> -q

# === Continue for each atomic unit ===
# Do NOT batch multiple files into one commit!
# Do NOT skip tests — a feature without tests is incomplete!
```

> ⚠️ **Fundamental rule: feature → tests → merge.** Every feature MUST include its tests in the same PR. Write tests right after the feature code (in a **separate commit**), before creating the PR. A PR without tests cannot be merged.
>
> **Tests go in separate commits.** Do not bundle tests into the same commit as the feature code.

Valid commit sequence example for one issue:

```
feat(api): add User model
feat(api): add POST /auth/register endpoint
feat(api): add POST /auth/login endpoint
feat(api): add JWT middleware
test(api): add auth tests
```

Commit message format:

```
<type>(<scope>): <short description>

Types: feat, fix, style, refactor, test, chore
Scope: api, ui, cli, core, ci, docs, deps
```

Always put `closes #<issue-number>` in the **PR body** (not the commit message), so the issue auto-closes on merge.

### 4. PR, Merge & cleanup

Once **ALL atomic units** (code + tests) are committed and pushed:

> 💡 **Keep your branch in sync**: during development, periodically rebase on `dev` to avoid large conflicts later. Prefer small, frequent rebases over a single painful one.

```bash
# Keep feature branch in sync with dev (rebase, don't merge)
git fetch origin dev
git rebase origin/dev
# Resolve conflicts if any, then:
git push origin feature/<issue-number>-<short-description> --force-with-lease

# Create Pull Request
gh pr create --base dev --title "<type>(<scope>): <feature description>" --body "closes #<issue-number>"

# Wait for CI to pass, then merge (preserves atomic commits)
gh pr merge --merge --delete-branch

# Verify issue auto-closed (GitHub sometimes misses the body reference)
gh issue list --limit 5 | grep "#<issue-number>"
# If still open, close manually:
#   gh issue close <issue-number> --comment "Resolved by PR #<pr-number>."

# Switch back to dev and sync
git checkout dev
git pull origin dev

# Delete local branch (remote already deleted by --delete-branch)
git branch -d feature/<issue-number>-<short-description>
```

> ⚠️ Use `--merge` (not `--squash`) to preserve atomic commit history on `dev`. GitHub should auto-close the issue because the PR body contains `closes #N`. However, this occasionally fails. **Always verify** with `gh issue list` after merge. If still open, close manually with `gh issue close <number>`.

### 5. After merge — update progress & close issue

After the PR is merged:

1. **Update ADR.md**: se la feature introduce una nuova dipendenza, vincolo o scelta architetturale, aggiornare le rispettive sezioni. Spostare la feature da "Da implementare" a "Completate".
2. **Update `.specs/plans/feature-[nome].md`**: impostare Status a `[x] Completata`, aggiungere data e note.
3. **Commit the updates**: `git add ADR.md .specs/plans/ && git commit -m "docs: update ADR and specs for completed issue-#N" && git push origin dev`
4. **Close the issue**: `gh issue close <number> --comment "Risolto da PR #<pr-number>."`
5. **Verify**: `gh issue list --limit 3 | grep "#<number>"` — se ancora aperta, chiudere manualmente
6. **Ask for approval**: briefly describe what was done and ask _"May I proceed with the next issue?"_ — do NOT start the next issue without user confirmation.

## Hotfix workflow

For urgent fixes directly on `dev` or `main`:

```bash
git checkout dev
git checkout -b hotfix/<issue-number>-<short-description>
# fix + commit + push
git commit -m "fix(scope): short description"
git push origin hotfix/<issue-number>-<short-description>
gh pr create --base dev --title "fix(scope): short description" --body "closes #N"
# wait for CI, then merge
gh pr merge --merge --delete-branch
git checkout dev
git pull origin dev
git branch -d hotfix/<issue-number>-<short-description>
```

## CI/CD Maintenance

When GitHub Actions runners deprecate a Node.js version (e.g. Node.js 20 → Node.js 24), the agent **must** update all workflow files (`.github/workflows/*.yml`) to use action versions that target the new runtime natively.

### How to fix Node.js deprecation warnings

1. **Remove** any `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` env variable (once Node 24 is the default, it's unnecessary).
2. **Update** each action to its latest major version that uses `node24` as runtime:

| Action                  | Old (Node 20) | New (Node 24)        |
| ----------------------- | ------------- | -------------------- |
| `actions/checkout`      | `@v4`         | `@v5`                |
| `actions/setup-node`    | `@v4`         | `@v5`                |
| `actions/github-script` | `@v7`         | `@v9`                |
| `actions/setup-python`  | `@v4`         | `@v5` (if available) |

3. **Verify** the new version's `action.yml` contains `runs.using: node24`.
4. **Commit** with message: `chore(ci): update actions to Node 24 runtime`.

> ⚠️ Always check the latest available version on the GitHub Marketplace before updating — versions listed above may be outdated.
