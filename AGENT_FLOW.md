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

## ⚠️ Pre-flight checklist (obbligatoria prima di agire)

Prima di creare/modificare/cancellare QUALSIASI file, l'agente DEVE verificare mentalmente TUTTI questi punti:

1. **Branch**: sono su `dev`? (MAI lavorare su `main`)
2. **Issue**: esiste un issue per questo task? Se no → crearlo PRIMA di scrivere codice.
3. **Plan**: esiste un file `.specs/plans/` per questa feature/bug? Se sì → seguirlo. Se no → crearlo PRIMA di scrivere codice.
4. **Consenso**: questa modifica cambia UX/architettura/comportamento visibile dall'utente? → Chiedere approvazione PRIMA.
5. **Contesto**: ho letto il file che voglio modificare? So cosa contiene?
6. **Commit atomic**: ogni file modificato è un commit separato (salvo eccezioni approvate).
7. **Build**: il codice compila? (eseguire `next build` o equivalente)
   > ⚠️ **MAI buildare (Tauri, sidecar, frontend) prima di aver committato.**
   > L'installer/build deve SEMPRE riflettere il codice committato, non modifiche non committate.
   > Committa → poi builda. Mai l'inverso.
8. **Documentazione**: CHANGELOG e ADR aggiornati dopo ogni completamento?
9. **PR**: dopo il merge su dev, ho creato PR da branch a dev?

> ℹ️ L'agente DEVE scorrere questa lista mentalmente prima di ogni azione. Se anche UN SOLO punto è violato, fermarsi e correggere PRIMA di procedere.

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
- **Wait for CI after PR creation before merging to dev.** If CI fails: fix the failure, push, wait for CI again, only then merge.
- **🚨 RELEASE: MAI procedere con una release senza esplicita richiesta del developer.** Anche se tutte le feature sono pronte, i test passano e la documentazione è aggiornata — l'agente NON deve bumpare la versione, fare merge su main o creare un tag senza che il developer dica esplicitamente _"fai la release"_ o _"procedi con la release"_. Questa è la regola più importante: **la release è una decisione del developer, non dell'agente.**

---

## Workflow Steps

### 1. Plan — Create an Issue

For every **feature**, create an issue with:

- **Title**: concise feature description
- **Body**: detailed description, acceptance criteria, technical notes
- **Labels**: relevant labels (e.g. `backend`, `frontend`, `bug`)

> ⚠️ **Prima di creare un issue per un bug sospetto, leggere SEMPRE il codice reale.**
> Non basarsi su appunti, KNOWN_ISSUES.md, ADR.md, o `.specs/plans/` — questi file possono essere datati.
> Verificare che il bug sia effettivamente presente nel codice prima di aprire l'issue.

Use the `mcp_gitkraken_cli_issues_create` tool (or project's issue tracker). The issue number determines the branch name.

> **Right after creating the issue**, write in the issue body the **complete list of expected atomic commits** (e.g. `feat(api): add User model`, `feat(api): add POST /auth/register`, `test(api): add auth tests`). This list serves as a roadmap — each commit must be executed exactly as planned before moving to the next. If an extra commit becomes necessary during implementation, add it to the list.

### 2. Branching — one branch per issue

```bash
git checkout dev
git checkout -b feature/<issue-number>-<short-description>
git push origin feature/<issue-number>-<short-description>
```

### 3. Subtask decomposition

Every issue MUST be broken down into **subtasks** listed in the issue body. Each subtask is ONE atomic unit:

- **New file**: Implementation (write file) → Update existing tests → Write new tests if needed → Verify tests pass → Commit
- **Modify file**: Read current file → Make change → Update existing tests → Verify tests pass → Commit

A subtask is NOT complete until its tests pass. If tests fail, fix and retry before moving to the next subtask.

### 4. Implementation & commit loop

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

# === SUBTASK 1b: Write or update tests for file A ===
# If file A is NEW: write tests for the code just committed
# If file A is MODIFIED: update existing tests to match the change
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

Valid commit sequence examples for one issue:

**New file example:**

```
feat(api): add User model
test(api): add User model tests
feat(api): add POST /auth/register endpoint
test(api): add auth register tests
```

**Modified file example:**

```
fix(ui): add category select to BugReportDialog
test(ui): update BugReportDialog tests for new category
```

Commit message format:

```
<type>(<scope>): <short description>

Types: feat, fix, style, refactor, test, chore
Scope: api, ui, cli, core, ci, docs, deps
```

Always put `closes #<issue-number>` in the **PR body** (not the commit message), so the issue auto-closes on merge.

### 5. End-of-task validation

After ALL subtasks are committed:

1. **Run the full test suite** (backend + frontend) to verify nothing is broken
2. If tests fail: fix the subtask that broke them, commit, re-run full suite
3. Only proceed when full suite passes locally

### 6. PR, CI & Merge

Once ALL subtasks are complete and the full test suite passes:

> 💡 **Keep your branch in sync**: during development, periodically rebase on `dev` to avoid large conflicts later. Prefer small, frequent rebases over a single painful one.

> ⚠️ **Version bump**: Before creating a release tag, update the version in ALL of these files to match the new tag:
>
> - `desktop/src-tauri/tauri.conf.json`
> - `frontend/package.json`
> - `backend/pyproject.toml`
>   Failure to do so will produce installers that still show the old version internally.

````bash
# Keep feature branch in sync with dev (rebase, don't merge)
git fetch origin dev
git rebase origin/dev
# Resolve conflicts if any, then:
git push origin feature/<issue-number>-<short-description> --force-with-lease

# Create Pull Request
gh pr create --base dev --title "<type>(<scope>): <feature description>" --body "closes #<issue-number>"

# ⚠️ WAIT for CI to pass on GitHub before proceeding
# Check: gh run list --limit 3 --workflow=test
# If CI fails: fix the issue, push, wait for CI again
# Only merge when CI is green

gh pr merge --merge --delete-branch

# ✅ Dopo il merge, verificare SEMPRE:
# 1. Issue chiusa: gh issue list --limit 5 | grep "#<issue-number>"
#    Se non è chiusa, chiuderla manualmente: gh issue close <issue-number>
# 2. Branch locale eliminato (--delete-branch fa già il remote, controllare locale):
#    git branch -d feature/<issue-number>-<short-description>
# 3. Branch remote eliminato: gh pr merge --delete-branch lo fa automaticamente

### 7. Release — pre-release checklist

> ⚠️ **MAI procedere con una release senza esplicita richiesta del developer.**
> Anche se tutto è pronto, l'agente aspetta che il developer dica "fai la release".

#### 7.1 Security audit (bloccante)

Prima di ogni release, eseguire gli audit di sicurezza del proprio stack tecnologico.
Trovare tutte le vulnerabilità **critical** e **high**. Ogni vulnerabilità va:
- **Fixata** (bump della dipendenza), oppure
- **Accettata con motivo** documentato in `KNOWN_ISSUES.md` (es: "sub-dip non fixabile", "devDependency", "falso positivo")

| Stack     | Comando                         | Bloccante? | Esempio documento accettazione                     |
| --------- | ------------------------------- | ---------- | --------------------------------------------------- |
| Node.js   | `npm audit` (o `yarn audit`)    | ✅ critical/high | `KNOWN_ISSUES.md` sezione Dipendenze con warning    |
| Python    | `pip-audit`                     | ✅ critical/high | `KNOWN_ISSUES.md` sezione Dipendenze con warning    |
| Rust      | `cargo audit`                   | ✅ high         | `KNOWN_ISSUES.md` sezione Dipendenze con warning    |
| Go        | `govulncheck`                   | ✅ high         | `KNOWN_ISSUES.md` sezione Dipendenze con warning    |
| PHP       | `composer audit`                | ✅ critical/high | `KNOWN_ISSUES.md` sezione Dipendenze con warning    |

> Se lo stack non è supportato da uno strumento automatico, eseguire un controllo manuale delle dipendenze note.

#### 7.2 Platform-specific release steps

Adattare i passi alle piattaforme del progetto corrente. Eseguire SOLO quelle applicabili.

**Webapp** (se presente):
- Build: `npm run build` / `next build` / `vite build` / equivalente
- Test suite completo: `pytest` / `vitest` / `jest` / equivalente
- Deploy preview (se disponibile)

**Desktop** (se presente):
- Build locale: eseguire il bundler della piattaforma (Tauri, Electron, PyInstaller, ecc.)
- Verificare che l'installer/binario venga generato correttamente
- Testare avvio e funzionalità base

**Mobile** (se presente):
- TypeScript/type check: `npx tsc --noEmit` / `dart analyze` / equivalente
- Test: `npx jest` / `flutter test` / equivalente
- Build cloud o locale (EAS, Xcode, Android Studio, eas build, ecc.)

#### 7.3 Version bump

**Regola d'oro: la versione è PER PIATTAFORMA.** Il web/desktop e il mobile hanno versioni **indipendenti** (es. web `0.1.34`, mobile `0.1.0`). Non usare mai la versione di una piattaforma per un'altra.

Aggiornare la versione in tutti i file che la dichiarano. Usare script automatico (`scripts/bump-version.js`) se disponibile, altrimenti manuale.

**Web/Desktop** → `node scripts/bump-version.js X.Y.Z` aggiorna:
- `frontend/package.json`
- `desktop/frontend/package.json`
- `desktop/frontend/package-lock.json`
- `desktop/src-tauri/tauri.conf.json`
- `desktop/src-tauri/Cargo.toml`
- `desktop/frontend/src/app/startup/page.tsx`
- `desktop/frontend/messages/en.json` + `it.json`
- `backend/pyproject.toml`

**Mobile** → lo stesso script ora aggiorna anche:
- `mobile/package.json`
- `mobile/app.json` (`version` + `expo.version`)

Sorgenti tipiche (se manuale) da controllare:
- `package.json` (root + ogni sub-package)
- `Cargo.toml` (Rust)
- `pyproject.toml` / `setup.cfg` (Python)
- `app.json` / `expo.version` (mobile)
- `tauri.conf.json` / `Info.plist` / `AndroidManifest.xml` (desktop)

#### 7.4 CHANGELOG

Aggiungere entry per la nuova release. Includere:
- Nuove feature
- Bug fix
- Breaking changes
- Dipendenze aggiornate

#### 7.5 Merge dev → main + tag

```bash
git checkout main
git merge dev --no-ff -m "merge: dev into main (vX.Y.Z)"
git push origin main
git tag vX.Y.Z && git push origin vX.Y.Z
```

---

## 8. Mobile app workflow

Il mobile ha un flusso diverso da web/desktop: la build finale richiede spesso un servizio cloud (EAS, App Center, CI custom) o una macchina specifica (Xcode, Android Studio). Il test utente è tipicamente post-merge.

### 8.1 Differenze principali dal flusso standard

| Aspetto                    | Web/Desktop                     | Mobile                                    |
| -------------------------- | ------------------------------- | ----------------------------------------- |
| Build locale               | `npm run build` / equivalente   | Type check + lint (no build finale locale) |
| Build finale               | Locale o CI                     | Cloud (EAS, App Center) o locale          |
| Test PR                    | CI su GitHub                    | Type check + test suite                   |
| Test utente                | Prima del merge (preview)       | **Dopo il merge** (build → installazione) |
| Version alignment          | N file (script dedicato)        | `package.json` + `app.json` / `pubspec`   |

### 8.2 Flusso mobile generico

```bash
git checkout dev
git checkout -b feature/<issue-number>-<short-description>
git push origin feature/<issue-number>-<short-description>

# 1. Implementazione + commit atomici
# Stessa regola: un commit per file logico
git add ... && git commit -m "feat(mobile): ..."
git push origin feature/<issue-number>-<short-description>

# 2. Type check / build check (obbligatorio)
npx tsc --noEmit              # TypeScript
# oppure: dart analyze        # Flutter
# oppure: ./gradlew assemble   # Android nativo

# 3. Test (se presenti)
npm test

# 4. PR → merge → branch cleanup
# Stessa procedura del flusso standard (step 6)

# 5. ⚠️ DOPO il merge su dev:
#    - Creare una build (cloud o locale)
#    - L'utente testa su dispositivo
#    - Se ci sono bug → nuova issue/branch → fix → PR → merge → nuova build

# 6. RELEASE: solo quando il developer dice esplicitamente "fai la release"
```

### 8.3 Regole specifiche mobile

1. **Type/compilation check obbligatorio** prima di ogni commit mobile. Se non passa, non si committa.
2. **Test obbligatori** solo se esistono. Se non ci sono test per la nuova feature, documentare il motivo.
3. **Build finale DOPO il merge**, non prima. Build cloud tipicamente richiedono 15-40 min, il branch intanto cambierebbe.
4. **Version alignment**: `mobile/package.json` e `mobile/app.json` (expo.version) devono essere allineati. `scripts/bump-version.js` li aggiorna entrambi. **La versione mobile è INDIPENDENTE da web/desktop** — non usare la versione del web per una release mobile (lezione appresa 2026-08-07: tag `v0.1.34-build9` errato, corretto in `v0.1.0-mobile`).
5. **Limitazioni del runtime**: alcune funzionalità JS/TS potrebbero non funzionare standalone (es. dynamic import, moduli Node-only). Verificare prima di usare.
6. **KNOWN_ISSUES.md** va aggiornato con le limitazioni mobile scoperte.
7. **CHANGELOG.md** va aggiornato con le feature mobile completate.

### 8.4 Esempi per framework comuni

**React Native / Expo:**
```bash
# Type check
npx tsc --noEmit
# Test
npx jest
# Build cloud (EAS)
npx eas-cli build --platform android --profile preview
```

**Flutter:**
```bash
# Type check
dart analyze
# Test
flutter test
# Build
flutter build apk
```

**Android nativo (Kotlin/Java):**
```bash
# Build check
./gradlew assembleDebug
# Test
./gradlew test
# Build release
./gradlew assembleRelease
```

> ⚠️ **Attenzione a `.easignore`** (Expo): i pattern devono essere ancorati con `/` (es. `/shared/`, `/*.png`) per non escludere accidentalmente file dentro `mobile/`. Errore comune: pattern senza `/` matchano a qualsiasi profondità.

---

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
````
