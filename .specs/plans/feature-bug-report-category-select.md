# Feature: Migliorare il Bug Report dialog

**Status:** ✅ Completata (2026-07-13, PR #265)
**Priority:** LOW
**Complexity:** Low

## Problema

Il campo "Cerca parola chiave" nel bug report dialog non è intuitivo. Meglio un select con opzioni predefinite, o un select combinato con input libero.

## Soluzione

- Creare un campo `category` di tipo select con opzioni predefinite (es. "UI", "PDF Processing", "Auth", "Altro")
- Oppure usare un select con opzioni + possibilità di scrivere liberamente (combo box / datalist HTML5)
