# Bug: Dark mode — testo bianco su sfondo bianco nei select/dropdown

**Status:** ✅ Completata (2026-07-13, issue #266)
**Priority:** MEDIUM
**Complexity:** Low

## Problemi

In tutte le dropdown list (select, option) con tema scuro:

- Testo bianco su sfondo bianco → illeggibile
- Colpisce: admin panel filtri, bug report status, language selector, license tier selector

## Causa

I tag `<option>` non ereditano automaticamente i colori del `<select>` in dark mode. Il browser usa i colori di sistema.

## Soluzione

Aggiungere classi Tailwind esplicite per dark mode su tutti i tag `<option>`:

```tsx
<option value="" className="dark:bg-gray-800 dark:text-gray-100">
```

Oppure aggiungere uno stile globale per `select option` in dark mode.
