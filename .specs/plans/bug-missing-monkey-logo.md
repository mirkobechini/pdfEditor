# Bug: Monkey logo image missing on Render deploy

**Status:** ✅ Risolto (2026-07-14) — File presente in `public/`, probabile cache Cloudflare
**Priority:** LOW (cosmetic)
**Complexity:** Low

## Problema

L'immagine `/orange-monkey_logo.png` non viene visualizzata su Render perché il file non è presente nella cartella `public/` o non viene inclusa nella build statica.

## Soluzione

1. Verificare che il file esista in `frontend/public/orange-monkey_logo.png`
2. Next.js static export richiede che le immagini siano in `public/` e vengano referenziate come `/orange-monkey_logo.png`
3. Se l'immagine non è necessaria, sostituire con un placeholder testuale o rimuovere il riferimento
