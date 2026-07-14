# Feature: Sostituzione I18nProvider custom con next-intl

**Status:** ✅ Completata (2026-07-01)

## Obiettivo

Sostituire l'attuale provider i18n custom con `next-intl` (già in `package.json`), seguendo la configurazione nativa per Next.js app router. Le traduzioni già presenti in `messages/en.json` e `messages/it.json` possono essere riutilizzate.

## Dipendenze

Nessuna — refactoring UI autonomo.

## Stack

- next-intl ^4.13.0
- Next.js app router
- React 19

## Output atteso

- Provider i18n custom rimosso
- next-intl configurato correttamente (middleware, `i18n/request.ts`, `next.config.ts`)
- Stessa struttura traduzioni (en.json, it.json) riutilizzata
- Dropdown selettore lingua nell'header (accanto dark mode toggle)
- IT come lingua primaria, EN come fallback
- Test che verificano il cambio lingua

## Status

[x] Completata
**Completata il:** 2026-06-27
**Note:** Sostituito il provider i18n custom con `NextIntlClientProvider` (client-side, compatibile con `output: 'export'`). Rimosso `useI18n()` a favore di `useTranslations(namespace)`. Test mock globale in setup.ts. 86 test passanti. 29 file modificati. (PR #94, issue #93)
