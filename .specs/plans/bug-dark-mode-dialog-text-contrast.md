# Bug: Dark mode — contrasto testo nei dialog

**Status:** ✅ Completata (2026-07-14, PR #286)
**Priority:** MEDIUM
**Complexity:** Low

## Problema

In dark mode, alcuni dialog mostrano titoli/testi scuri su sfondo scuro (leggibilità bassa), in particolare nei modali di editing PDF e bug report.

Componenti coinvolti:

- `MergeDialog.tsx`
- `SplitDialog.tsx`
- `ReorderDialog.tsx`
- `RemoveDialog.tsx`
- `MetadataDialog.tsx`
- `ProtectDialog.tsx`
- `ReplaceTextDialog.tsx`
- `BugReportDialog.tsx`

## Soluzione

Uniformate classi colore testo per dark mode:

- Titoli: `text-gray-900 dark:text-gray-100`
- Testo file/list item: `text-gray-900 dark:text-gray-100`
- Empty states coerenti con `dark:text-gray-500`

## Outcome

Contrasto testo coerente e leggibile in tutti i dialog principali.
