# Chore: Frontend 100% Test Coverage

**Status:** Planning
**Priority:** MEDIA (Quality)
**Complexity:** HIGH
**Estimated Time:** 2-3 days

---

## Obiettivo

Portare la copertura dei test frontend dal **35% al 100%**, coprendo tutti i componenti React e utility.

## Stato attuale

- **108 test, 22 test files**
- **Coverage: 35%** (437/1219 linee)
- **Framework:** vitest + jsdom + @testing-library/react

## Moduli da coprire

### Fase 1 — Componenti core (priorità alta, ~50% coverage)

| Componente           | Stato     | Test da scrivere                             |
| -------------------- | --------- | -------------------------------------------- |
| `Sidebar.tsx`        | ❌ 0 test | Upload, drag&drop, file list, rename, delete |
| `Toolbar.tsx`        | ❌ 0 test | Button rendering, canUndo/canRedo props      |
| `PdfViewer.tsx`      | ❌ 0 test | Rendering, password unlock, zoom, page nav   |
| `AppLayout.tsx`      | 🟡 1 test | Header, sidebar, toolbar, viewer layout      |
| `HeaderControls.tsx` | 🟡 2 test | Dark mode, language, user display            |
| `AuthProvider`       | 🟡 4 test | Login, register, logout, session restore     |
| `LandingNavbar`      | 🟡 4 test | Logo, auth buttons, links                    |
| Totale Fase 1        |           | **~8 nuovi test files, ~60 test**            |

### Fase 2 — Dialoghi (priorità media, ~70% coverage)

| Componente              | Stato     | Test da scrivere                       |
| ----------------------- | --------- | -------------------------------------- |
| `MergeDialog.tsx`       | 🟡 1 test | File list, selection, merge action     |
| `SplitDialog.tsx`       | ❌ 0 test | Thumbnails, cut lines, split action    |
| `ReorderDialog.tsx`     | 🟡 4 test | Drag&drop, reorder action              |
| `RemoveDialog.tsx`      | ❌ 0 test | Page selection, confirm, remove action |
| `MetadataDialog.tsx`    | ❌ 0 test | Load metadata, save metadata           |
| `ReplaceTextDialog.tsx` | ❌ 0 test | Search, replace, replaceAll            |
| `ProtectDialog.tsx`     | ❌ 0 test | Password, confirm, protect action      |
| `DeleteModal.tsx`       | 🟡 3 test | Confirm, cancel, delete action         |
| Totale Fase 2           |           | **~5 nuovi test files, ~40 test**      |

### Fase 3 — Pagine & Utility (priorità bassa, ~100% coverage)

| Componente          | Stato     | Test da scrivere                  |
| ------------------- | --------- | --------------------------------- |
| `LoginPage`         | 🟡 4 test | Form, validation, error, redirect |
| `RegisterPage`      | 🟡 5 test | Form, validation, error, redirect |
| `ProfilePage`       | ❌ 0 test | Display, edit name, save          |
| `AdminPage`         | 🟡 5 test | Users tab, bugs tab, filters      |
| `BugReportDialog`   | ❌ 0 test | Form, submit, validation          |
| `GoogleLoginButton` | ❌ 0 test | Render, click                     |
| `PdfThumbnail`      | ❌ 0 test | Render, error fallback            |
| `api.ts`            | ❌ 0 test | All API methods                   |
| `i18n.ts`           | ❌ 0 test | Locale switching                  |
| `download.ts`       | ❌ 0 test | Blob download                     |
| Totale Fase 3       |           | **~7 nuovi test files, ~50 test** |

## Strategia

### Per ogni componente

1. **Render test** — Il componente si renderizza senza crash
2. **Props test** — Diverse combinazioni di props
3. **Interaction test** — Click, input, form submit
4. **Error test** — Stato di errore, fallback
5. **Edge case** — Empty state, loading state

### Pattern

```tsx
// Esempio di test per un dialog
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import MergeDialog from "./MergeDialog";

// Mock API
vi.mock("../lib/api", () => ({
  api: {
    listPdfs: vi.fn(),
    mergePdfs: vi.fn(),
    downloadPdf: vi.fn(),
  },
}));

describe("MergeDialog", () => {
  it("renders when open", () => {
    render(<MergeDialog open={true} onClose={vi.fn()} selectedId="1" />);
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    const { container } = render(
      <MergeDialog open={false} onClose={vi.fn()} selectedId="1" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

## Dipendenze

- Nessuna nuova dipendenza — già tutto installato (vitest, @testing-library/react, jsdom)

## Output atteso

- **~200 test totali** (da 108)
- **100% coverage** su tutti i moduli
- **0 test falliti**
- Coverage report generabile con `npm run coverage`

## Files da creare

### Fase 1 (Core)

- `frontend/src/app/components/__tests__/Sidebar.test.tsx`
- `frontend/src/app/components/__tests__/Toolbar.test.tsx`
- `frontend/src/app/components/__tests__/PdfViewer.test.tsx`
- `frontend/src/app/components/__tests__/AppLayout.test.tsx` (esistente, espandere)
- `frontend/src/app/components/__tests__/HeaderControls.test.tsx` (esistente, espandere)

### Fase 2 (Dialoghi)

- `frontend/src/app/components/__tests__/SplitDialog.test.tsx`
- `frontend/src/app/components/__tests__/RemoveDialog.test.tsx`
- `frontend/src/app/components/__tests__/MetadataDialog.test.tsx`
- `frontend/src/app/components/__tests__/ReplaceTextDialog.test.tsx`
- `frontend/src/app/components/__tests__/ProtectDialog.test.tsx`

### Fase 3 (Pagine & Utility)

- `frontend/src/app/__tests__/api.test.ts`
- `frontend/src/app/__tests__/i18n.test.ts`
- `frontend/src/app/__tests__/download.test.ts`
- `frontend/src/app/app/profile/__tests__/page.test.tsx`
- `frontend/src/app/components/__tests__/BugReportDialog.test.tsx`
- `frontend/src/app/components/__tests__/PdfThumbnail.test.tsx`
- `frontend/src/app/components/__tests__/GoogleLoginButton.test.tsx`

## Definition of Done

- [ ] Coverage 100% su tutti i moduli frontend
- [ ] Tutti i test passano: `npx vitest run --coverage`
- [ ] Nessun warning nei test
- [ ] PR mergiata su dev
