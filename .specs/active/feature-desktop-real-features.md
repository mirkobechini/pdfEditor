# Feature: Implementare funzionalità reali al posto dei mockup desktop

## Obiettivo

La desktop app ha quasi tutte le feature della tabella segnate come "✅" ma in realtà sono solo bottoni senza onClick. Vanno implementate tutte.

## Stato attuale

**Funzionante:**

- Upload PDF (locale + drag & drop)
- PDF viewer (zoom, navigazione pagine)
- Lista documenti recenti

**Solo mockup (bottoni senza onClick):**

- Toolbar: Merge, Split, Reorder, Remove, Metadata
- Fast Actions: MERGE, SPLIT, OCR, LOCK

## Cosa implementare

1. **Merge**: dialog per selezionare PDF da unire + chiamata API
2. **Split**: dialog per scegliere modalità (every/range) + chiamata API
3. **Reorder**: dialog con drag & drop pagine + chiamata API
4. **Remove Pages**: dialog per selezionare pagine da rimuovere + chiamata API
5. **Metadata**: dialog per editare titolo/autore + chiamata API
6. **Protect/Unlock**: dialog per password + chiamata API
7. **Replace Text**: dialog find & replace + chiamata API
8. **Extract Text**: estrazione testo + download

## Priorità

1. Toolbar buttons (Merge, Split, Reorder, Remove, Metadata)
2. Fast Actions (MERGE, SPLIT → già coperti, OCR → futuro, LOCK → Protect)
3. Replace Text, Extract Text

## Dipendenze

- `shared/src/api.ts` ha già tutti i metodi (mergePdfs, splitPdf, reorderPages, etc.)
- I dialog già esistono nella webapp (`frontend/src/app/components/`) — possono essere adattati

## Status

[ ] Non iniziata
