# Feature: Mobile app migliorie post-MVP (issue 618)

## Obiettivo

Migliorie UX e funzionalità mancanti dopo il completamento del MVP mobile.

---

## Panoramica completa

### 🐛 Bug aperti

| #   | Bug                        | Probabile fix                             |
| --- | -------------------------- | ----------------------------------------- |
| B1  | Login non mostra errori    | actionLoading separato da loading         |
| B2  | Login overlay non visibile | Stesso fix                                |
| B3  | Icona app non corretta     | monochromeImage rimosso, icona rigenerata |
| B4  | Bottoni viola              | theme aggiunto a PaperProvider            |

### ❌ Feature mancanti dal piano originale

| #   | Cosa                                                      | Priorità | Note                                                                                                                                         |
| --- | --------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Sync cloud push/pull                                      | Media    | **Da pianificare meglio.** Sync bidirezionale su tutte le piattaforme (web, desktop, mobile). I guest NON hanno cloud sync. Vedi nota sotto. |
| F2  | EAS CI Integration                                        | Bassa    | Build automatica su tag release                                                                                                              |
| F3  | Metadata editing (titolo/autore)                          | Media    | pdf-lib supporta, manca UI                                                                                                                   |
| F4  | Password protect/unlock PDF                               | Media    | pdf-lib supporta, manca UI                                                                                                                   |
| F5  | Componenti UI (PdfListItem, GuestBanner, SyncStatusBadge) | Bassa    | Da estrarre da screens                                                                                                                       |
| F6  | Hook useSyncQueue                                         | Media    | Per coda sync offline                                                                                                                        |
| F7  | Test componenti UI                                        | Bassa    | Bloccato da @testing-library/react-native                                                                                                    |
| F8  | Rework UI completo (Penpot)                               | Alta     | UI da rifare col design                                                                                                                      |
| F9  | Bottom tabs navigation                                    | Bassa    | Invece di solo stack                                                                                                                         |

### 💡 Migliorie UX proposte

| #   | Cosa                           | Perché                                  |
| --- | ------------------------------ | --------------------------------------- |
| M1  | Toast/notifica dopo operazioni | Invece di testo "result" in ToolsScreen |
| M2  | Refresh-to-reload in Home      | Pull down per ricaricare lista PDF      |
| M3  | Badge count su icona           | Mostrare numero PDF nella lista         |
| M4  | Swipe-to-delete in Home        | Swipe left per eliminare veloce         |
| M5  | Search/filtro in Home          | Cercare PDF per nome                    |
| M6  | Preview thumbnail in Home      | Miniatura prima pagina nella lista      |
| M7  | Share PDF                      | Condividere via Android share sheet     |
| M8  | Multi-select in Home           | Per operazioni batch                    |
| M9  | Animazioni transizioni         | Transizioni più fluide                  |
| M10 | Splash screen personalizzata   | Invece di schermo bianco all'avvio      |

---

## Task in ordine di esecuzione (scelte dall'utente)

1. **Metadata editing** (F3) — dialog per titolo/autore — ✅ **Completata** (2026-08-07)
2. **Password protect/unlock PDF** (F4) — ⏸ **In pausa** — vedi note sotto
3. **Hook useSyncQueue** (F6) — sync in background — ✅ **Completata** (2026-08-08)
4. **Refresh-to-reload in Home** (M2) — pull-to-refresh — ✅ **Completata** (2026-08-08)
5. **UX Tools Opzione A** — Tool-first: prima seleziona il tool, poi i PDF. Tool selezionato evidenziato in arancione. — ✅ **Completata** (2026-08-08)
6. **Search/filter in Home** (M5) — barra di ricerca
7. **Preview thumbnail in Home** (M6) — miniatura prima pagina
8. **Toast/notifiche** (M1) — Snackbar al posto di "result"
9. **Swipe to delete** (M4) — con conferma

---

## ⏸ Task 2 (F4) — Password protect/unlock: PAUSA con note

**Stato:** Sospeso il 2026-08-07 su decisione dell'utente. UI e funzioni già scritte ma NON operative.

### Cosa è già implementato (codice presente ma non funzionante)

- `mobile/src/services/pdfService.ts`: funzioni `protectPdf()`, `unlockPdf()`, `isPdfEncrypted()` — usano `doc.encrypt()` e `PDFDocument.load(bytes, { password })`
- `mobile/src/screens/ToolsScreen.tsx`: bottoni "Password" e "Unlock" in toolbar + dialog password (con conferma e validazione)

### Perché è in pausa — limitazione libreria

`pdf-lib@1.17.1` (l'ultima versione ufficiale) **NON supporta** encryption/decryption. Il tipo `PDFDocument` non ha `encrypt()` né l'opzione `password` in `load()`. Compile error:

```
Property 'encrypt' does not exist on type 'PDFDocument'
Object literal may only specify known properties, and 'password' does not exist in type 'LoadOptions'
```

### Opzioni valutate

| Opzione                                  | Pro                                                            | Contro                                                                                                        | Verdetto                     |
| ---------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **Fork `@cantoo/pdf-lib` v2.8.1**        | Supporta `encrypt()` + `password` in load, drop-in replacement | Importa `node-html-better-parser` (Node-only) in `PDFDocument.js` → rischio fallimento bundle Metro/EAS in RN | ⚠️ Da testare, rischio build |
| Crittografia manuale (RC4/AES + trailer) | Nessuna dipendenza nuova                                       | Complesso, fragile, tanto lavoro                                                                              | ❌ Sconsigliato              |
| Altro fork con encryption                | —                                                              | Da cercare/valutare                                                                                           | ?                            |

### Prossimi passi quando si riprende

1. Decidere se migrare a `@cantoo/pdf-lib` (testare `npx expo export` o build EAS con metro config se serve escludere `node-html-better-parser`)
2. Se il fork funziona in RN → riattivare il codice già scritto
3. Se NON funziona → cercare alternativa o rivedere scope della feature
4. Se si riprende: ricordarsi che il codice in `pdfService.ts` e `ToolsScreen.tsx` è già pronto

---

## Status

[ ] In corso — Task 1 completata, Task 2 in pausa
