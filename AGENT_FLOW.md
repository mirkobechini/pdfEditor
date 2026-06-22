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

Build one **vertical section** at a time and finish it completely before moving to the next.
Each commit = **one atomic functionality** (one JS feature or one DOM section).

Order: **head → header → sidebar → toolbar → viewer → modals → final touches**

| #                  | Section             | Commit message                                                     | What to add                                                                                                                                                                 |
| ------------------ | ------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HEAD + BODY**    |
| 1                  | `head`              | `feat(html): add head with CDN assets, styles, and body shell`     | `<head>` (meta, CDN: TailwindCSS, PDF.js, Font Awesome), `<style>` (full-height, custom-scroll, sidebar-transition), `<body>` opening + `<div id="app">` + `</body></html>` |
| **HEADER**         |
| 2                  | `header`            | `feat(header): add top bar with logo and app title`                | `<header>` with hamburger button (`#menuToggle`), PDF icon, "PdfEditor" title, `#fileStatus` span                                                                           |
| **SIDEBAR — HTML** |
| 3                  | `sidebar-shell`     | `feat(sidebar): add sidebar shell with mobile header and overlay`  | `<aside id="sidebar">`: mobile header ("File PDF" + `#sidebarClose`), empty placeholder, plus `#sidebarOverlay` div                                                         |
| 4                  | `sidebar-upload`    | `feat(sidebar): add upload area with drag-and-drop HTML`           | Upload `<label>` inside sidebar: dashed border, cloud icon, "Carica PDF", "massimo 50 MB", hidden `#fileInput`                                                              |
| 5                  | `sidebar-list`      | `feat(sidebar): add file list container with empty state`          | `<div id="pdfList">` with scroll, empty state paragraph ("Nessun PDF caricato")                                                                                             |
| **SIDEBAR — JS**   |
| 6                  | `js-upload`         | `feat(js): add file upload with ArrayBuffer reader and validation` | `fileInput` change listener, `FileReader` → ArrayBuffer, type/size validation (50MB), push to `pdfFiles[]`, auto-load first file                                            |
| 7                  | `js-list-render`    | `feat(js): add file list render with click-to-select`              | `renderFileList()`: sort by date, per-file items with name/size, active highlight, click to `loadPdfFromFile()`                                                             |
| 8                  | `js-rename`         | `feat(js): add file rename with modal dialog`                      | Rename modal HTML, `renameModal` open/close, `#renameInput` + confirm, `sanitizeName()`, file.name update                                                                   |
| 9                  | `js-delete`         | `feat(js): add file delete with confirmation dialog`               | `deleteFile()`: confirm prompt, splice from array, clean viewer if active, `renderFileList()`                                                                               |
| 10                 | `js-download`       | `feat(js): add file download via Blob URL`                         | `#downloadBtn` listener: `Blob` from ArrayBuffer, `URL.createObjectURL`, trigger download, revoke                                                                           |
| 11                 | `js-sidebar-toggle` | `feat(js): add sidebar toggle for mobile (hamburger + overlay)`    | `toggleSidebar()`, `#menuToggle` click, `#sidebarClose` click, `#sidebarOverlay` click                                                                                      |
| **TOOLBAR — HTML** |
| 12                 | `toolbar-nav`       | `feat(toolbar): add page navigation controls HTML`                 | `#firstPage`, `#prevPage`, `#pageInput`, `#pageCount`, `#nextPage`, `#lastPage` buttons with title attributes                                                               |
| 13                 | `toolbar-actions`   | `feat(toolbar): add zoom controls and action buttons HTML`         | `#zoomOut`, `#zoomLevel`, `#zoomIn`, `#fitWidth`, `#annotateBtn`, `#editBtn`, `#convertBtn`, `#downloadBtn`                                                                 |
| **TOOLBAR — JS**   |
| 14                 | `js-navigation`     | `feat(js): add page navigation (buttons + keyboard)`               | Click listeners for first/prev/next/last, `pageInput` change, keyboard arrows left/right and pgup/pgdn                                                                      |
| 15                 | `js-zoom`           | `feat(js): add zoom in/out and fit-width logic`                    | `SCALE_STEP/MIN_SCALE/MAX_SCALE`, zoom +/- click, fit-width calculation, zoom level display update                                                                          |
| **VIEWER — HTML**  |
| 16                 | `viewer-canvas`     | `feat(viewer): add PDF.js canvas element`                          | `<canvas id="pdfCanvas">` inside viewer container, hidden by default                                                                                                        |
| **VIEWER — JS**    |
| 17                 | `js-pdfjs-init`     | `feat(js): initialize PDF.js and render page on load`              | `pdfjsLib.GlobalWorkerOptions.workerSrc`, `loadPdf()` → `getDocument`, `renderPage()` with `page.render()`, `updateButtons()` state toggle                                  |
| **MODALS — HTML**  |
| 18                 | `modal-convert`     | `feat(modal): add conversion modal with format options HTML`       | Conversion modal: 4 format cards (DOCX/XLSX/PNG/JPG), close button, status line, overlay                                                                                    |
| **MODALS — JS**    |
| 19                 | `js-convert-modal`  | `feat(js): add conversion modal open/close and format selection`   | `#convertBtn` open, `#closeConvertModal` close, click-outside close, format selection with simulated conversion (placeholder alert)                                         |
| **FINAL TOUCHES**  |
| 20                 | `style-responsive`  | `style(ui): add mobile responsive refinements and tooltips`        | Tooltip CSS (`.tooltip-btn`), drag-and-drop events on upload label, any remaining responsive polish                                                                         |

> ⚠️ The AI agent MUST follow the table above in order, section by section. Each row = one commit. Do NOT skip or merge any row.

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
