# Feature: Mobile app migliorie post-MVP (issue 618)

## Obiettivo
Migliorie UX e funzionalità mancanti dopo il completamento del MVP mobile.

---

## 🐛 Bug aperti (da testare in build #9)
| # | Bug | Probabile fix |
|---|-----|---------------|
| B1 | **Login non mostra errori** | Separato `actionLoading` da `loading` iniziale |
| B2 | **Login overlay non visibile** | Stesso fix, overlay usa `actionLoading` |
| B3 | **Icona app non corretta** | Rimosso monochromeImage da app.json, icona rigenerata senza sfondo bianco |
| B4 | **Bottoni viola** | Aggiunto `theme={lightTheme}` al PaperProvider |

## ❌ Feature mancanti dal piano originale
| # | Cosa | Priorità | Note |
|---|------|----------|------|
| 1 | **Sync cloud push/pull** | Media | Sync bidirezionale PDF (Fase 4b) |
| 2 | **EAS CI Integration** | Bassa | Build automatica su tag release |
| 3 | **Metadata editing (titolo/autore)** | Bassa | pdf-lib supporta, manca UI |
| 4 | **Password protect/unlock PDF** | Bassa | pdf-lib supporta, manca UI |
| 5 | **Componenti UI (PdfListItem, GuestBanner, SyncStatusBadge)** | Bassa | Da estrarre da screens |
| 6 | **Hook useSyncQueue** | Bassa | Per coda sync offline |
| 7 | **Test componenti UI** | Bassa | Bloccato da @testing-library/react-native |
| 8 | **Rework UI completo (Penpot)** | Alta | UI da rifare col design |
| 9 | **Bottom tabs navigation** | Bassa | Invece di solo stack |

## 💡 Cose da aggiungere/modificare
| # | Cosa | Perché |
|---|------|--------|
| 1 | **Toast/notifica dopo operazioni** | Invece di testo "result" in ToolsScreen, un toast che sparisce |
| 2 | **Refresh-to-reload in Home** | Pull down per ricaricare lista PDF |
| 3 | **Badge count su icona** | Per mostrare numero PDF nella lista |
| 4 | **Swipe-to-delete in Home** | Swipe left su PDF per eliminare veloce |
| 5 | **Search/filtro in Home** | Se ci sono tanti PDF |
| 6 | **Preview thumbnail in Home** | Miniatura della prima pagina (pdf-lib può estrarla) |
| 7 | **Share PDF** | Condividere PDF via Android share sheet |
| 8 | **Multi-select in Home** | Per operazioni batch |
| 9 | **Animazioni transizioni** | Transizioni più fluide tra schermate |
| 10 | **Splash screen personalizzata** | Invece dello schermo bianco all'avvio |

## Riepilogo priorità
1. Bug fix (build #9) → 2. Rework UI (Penpot) → 3. Feature sync cloud → 4. Migliorie UX

## Status
[ ] Non iniziato
