# Feature: Mobile app migliorie post-MVP (issue 618)

## Obiettivo
Migliorie UX e funzionalità mancanti dopo il completamento del MVP mobile.

---

## Panoramica completa

### 🐛 Bug aperti
| # | Bug | Probabile fix |
|---|-----|---------------|
| B1 | Login non mostra errori | actionLoading separato da loading |
| B2 | Login overlay non visibile | Stesso fix |
| B3 | Icona app non corretta | monochromeImage rimosso, icona rigenerata |
| B4 | Bottoni viola | theme aggiunto a PaperProvider |

### ❌ Feature mancanti dal piano originale
| # | Cosa | Priorità | Note |
|---|------|----------|------|
| F1 | Sync cloud push/pull | Media | Sync bidirezionale PDF (Fase 4b) |
| F2 | EAS CI Integration | Bassa | Build automatica su tag release |
| F3 | Metadata editing (titolo/autore) | Media | pdf-lib supporta, manca UI |
| F4 | Password protect/unlock PDF | Media | pdf-lib supporta, manca UI |
| F5 | Componenti UI (PdfListItem, GuestBanner, SyncStatusBadge) | Bassa | Da estrarre da screens |
| F6 | Hook useSyncQueue | Media | Per coda sync offline |
| F7 | Test componenti UI | Bassa | Bloccato da @testing-library/react-native |
| F8 | Rework UI completo (Penpot) | Alta | UI da rifare col design |
| F9 | Bottom tabs navigation | Bassa | Invece di solo stack |

### 💡 Migliorie UX proposte
| # | Cosa | Perché |
|---|------|--------|
| M1 | Toast/notifica dopo operazioni | Invece di testo "result" in ToolsScreen |
| M2 | Refresh-to-reload in Home | Pull down per ricaricare lista PDF |
| M3 | Badge count su icona | Mostrare numero PDF nella lista |
| M4 | Swipe-to-delete in Home | Swipe left per eliminare veloce |
| M5 | Search/filtro in Home | Cercare PDF per nome |
| M6 | Preview thumbnail in Home | Miniatura prima pagina nella lista |
| M7 | Share PDF | Condividere via Android share sheet |
| M8 | Multi-select in Home | Per operazioni batch |
| M9 | Animazioni transizioni | Transizioni più fluide |
| M10 | Splash screen personalizzata | Invece di schermo bianco all'avvio |

---

## Task in ordine di esecuzione (scelte dall'utente)

1. **Metadata editing** (F3) — dialog per titolo/autore
2. **Password protect/unlock PDF** (F4) — dialog per password
3. **Hook useSyncQueue** (F6) — sync in background
4. **Refresh-to-reload in Home** (M2) — pull-to-refresh
5. **Search/filter in Home** (M5) — barra di ricerca
6. **Preview thumbnail in Home** (M6) — miniatura prima pagina
7. **Toast/notifiche** (M1) — Snackbar al posto di "result"
8. **Swipe to delete** (M4) — con conferma

## Status
[ ] Non iniziato
