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

| Pagina          |    Stato    | Note                                                                                                                                                                                                                                       |
| --------------- | :---------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/app` (editor) | 🟡 Parziale | Documenti reali, upload reale, viewer reale. **Toolbar mock**: Edit/Organize/Convert tabs non fanno nulla. Merge/Split/Reorder/Remove/Metadata sono bottoni senza handler.                                                                 |
| `/settings`     | 🟡 Parziale | **Salvataggio backend funzionante** ✅ Tema/antialiasing/densità applicati all'UI. **Bottoni Advanced e About funzionanti** ✅ **❌ About**: dati licenza e dispositivi hardcoded. **❌ Segnala bug**: da implementare dialog webapp-like. |
| `/license`      |   🔴 Mock   | Licenza hardcoded, tier finti, bottoni non funzionanti.                                                                                                                                                                                    |
| `/wizard`       |  ✅ Reale   | Funzionante                                                                                                                                                                                                                                |
| `/login`        |  ✅ Reale   | Funzionante                                                                                                                                                                                                                                |
| `/register`     |  ✅ Reale   | Funzionante                                                                                                                                                                                                                                |
| `/startup`      |  ✅ Reale   | Funzionante                                                                                                                                                                                                                                |

## Fix da fare

### 1. Applicare le impostazioni salvate ✅

Tema, antialiasing, densità applicati all'UI. Zoom da collegare all'editor.

### 2. Bottoni Advanced e About (settings page) ✅

Log di sistema, cancella cache, note di rilascio, documentazione funzionanti. **Segnala bug**: da implementare dialog webapp-like (plan separato).

### 3. About dati hardcoded

- `licenseRows` contiene "Chiave licenza" e "Attivata su 2 dispositivi di 3" — dati finti
- Rimuovere o rendere dinamico con dati reali dal backend

### 4. Toolbar editor (Merge/Split/Reorder/Remove/Metadata)

I bottoni nella toolbar sono solo placeholder. Implementare i dialog (vedi plan separati).

### 5. Edit/Organize/Convert tabs

Non fanno nulla. Decidere se implementare o rimuovere.

### 6. Pagina license

Rimuovere dati hardcoded. Valutare se serve o se usare la licenza reale dal backend.

## Status

[ ] Non iniziata

## Status

[ ] Non iniziata
