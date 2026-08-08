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
| F5  | Componenti UI (PdfListItem, GuestBanner, SyncStatusBadge) | Bassa    | ✅ Completata                                                                                                                                |
| F6  | Hook useSyncQueue                                         | Media    | Per coda sync offline                                                                                                                        |
| F7  | Test componenti UI                                        | Bassa    | Bloccato da @testing-library/react-native                                                                                                    |
| F8  | Rework UI completo (Penpot)                               | Alta     | UI da rifare col design                                                                                                                      |
| F9  | Bottom tabs navigation                                    | Bassa    | ✅ Completata                                                                                                                                |

### 💡 Migliorie UX proposte

| #   | Cosa                           | Perché                                  |
| --- | ------------------------------ | --------------------------------------- | ------------- |
| M1  | Toast/notifica dopo operazioni | Invece di testo "result" in ToolsScreen |
| M2  | Refresh-to-reload in Home      | Pull down per ricaricare lista PDF      |
| M3  | Badge count su icona           | Mostrare numero PDF nella lista         | ✅ Completata |
| M4  | Swipe-to-delete in Home        | Swipe left per eliminare veloce         |
| M5  | Search/filtro in Home          | Cercare PDF per nome                    |
| M6  | Preview thumbnail in Home      | Miniatura prima pagina nella lista      | ✅ Completata |
| M7  | Share PDF                      | Condividere via Android share sheet     | ✅ Completata |
| M8  | Multi-select in Home           | Per operazioni batch                    | ✅ Completata |
| M9  | Animazioni transizioni         | Transizioni più fluide                  |
| M10 | Splash screen personalizzata   | Invece di schermo bianco all'avvio      | ✅ Completata |

---

## Task in ordine di esecuzione (scelte dall'utente)

1. **Metadata editing** (F3) — dialog per titolo/autore — ✅ **Completata** (2026-08-07)
2. **Password protect/unlock PDF** (F4) — ✅ **Completata** (2026-08-08) — @cantoo/pdf-lib@2.8.1
3. **Hook useSyncQueue** (F6) — sync in background — ✅ **Completata** (2026-08-08)
4. **Refresh-to-reload in Home** (M2) — pull-to-refresh — ✅ **Completata** (2026-08-08)
5. **UX Tools Opzione A** — Tool-first: prima seleziona il tool, poi i PDF. Tool selezionato evidenziato in arancione. — ✅ **Completata** (2026-08-08)
6. **Search/filter in Home** (M5) — barra di ricerca — ✅ **Completata** (2026-08-08)
7. **Preview thumbnail in Home** (M6) — miniatura prima pagina — ✅ **Completata** (2026-08-08)
8. **Toast/notifiche** (M1) — Snackbar al posto di "result" — ✅ **Completata** (2026-08-08)
9. **Swipe to delete** (M4) — swipe per eliminare veloce con conferma — ✅ **Completata** (2026-08-08)
10. **Bottom tabs navigation** (F9) — Home + Settings tabs — ✅ **Completata** (2026-08-08)

---

## ✅ Task 2 (F4) — Password protect/unlock: COMPLETATA

**Stato:** Completata il 2026-08-08. Migrato a `@cantoo/pdf-lib@2.8.1` che supporta `encrypt()` e `password` in `load()`. UI Password/Unlock in ToolsScreen attiva.

---

## Status

[x] Completata — Task 1 (F3 Metadata), 3 (F6 SyncQueue), 4 (M2 Refresh), 5 (M1 Snackbar Tools), 6 (M5 Search), 7 (M6 Thumbnail), 8 (M1 Snackbar), 9 (M4 Swipe), 10 (F9 Bottom tabs), M3 (Badge), M7 (Share), M8 (Multi-select), M10 (Splash), F5 (Components)
[x] Completata — Task 2 (F4 Password) — @cantoo/pdf-lib@2.8.1 con encrypt support
[ ] Non iniziata — M9 (Animations)
