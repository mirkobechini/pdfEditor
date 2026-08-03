# Feature: Replace Mock Pages with Real Pages

**Status:** Non iniziata

## Obiettivo

Verificare se ci sono ancora schermate che sono solo mockup invece di pagine effettive con dati reali, e sostituirle.

## Dipendenze

- Nessuna

## Stack

- React + TailwindCSS (desktop frontend)

## Output atteso

- Audit di tutte le pagine del frontend desktop
- Identificazione di componenti con dati finti/mock
- Sostituzione con dati reali dal backend
- Rimozione di eventuali placeholder

## Pagine da verificare — Risultati audit

| Pagina | Stato | Note |
|--------|:-----:|------|
| `/app` (editor) | 🟡 Parziale | Documenti reali, upload reale, viewer reale. **Toolbar mock**: Edit/Organize/Convert tabs non fanno nulla. Merge/Split/Reorder/Remove/Metadata sono bottoni senza handler. |
| `/settings` | 🟡 Parziale | i18n funzionante, scroll ok. **Valori hardcoded**: lingua, tema, densità, zoom. Bottoni About non funzionanti. |
| `/license` | 🔴 Mock | Licenza hardcoded, tier finti, bottoni non funzionanti. |
| `/wizard` | ✅ Reale | Funzionante |
| `/login` | ✅ Reale | Funzionante |
| `/register` | ✅ Reale | Funzionante |
| `/startup` | ✅ Reale | Funzionante |

## Fix da fare

### 1. Toolbar editor (Merge/Split/Reorder/Remove/Metadata)
I bottoni nella toolbar sono solo placeholder. Implementare i dialog (vedi plan separati).

### 2. Edit/Organize/Convert tabs
Non fanno nulla. Decidere se implementare o rimuovere.

### 3. Pagina license
Rimuovere dati hardcoded. Valutare se serve o se usare la licenza reale dal backend.

### 4. Impostazioni con dati reali
Collegare lingua, tema, ecc. a preferenze reali (localStorage o backend).

## Status

[ ] Non iniziata