# Feature: Migliorare la User Dashboard (profilo)

**Status:** Open
**Priority:** MEDIUM
**Complexity:** Low

## Problemi

1. **Nome completo non caricato di default** — Il campo "full_name" nella dashboard profilo non è precompilato al caricamento
2. **Mancanza navbar con logo Scimmia/PdfEditor** — La dashboard profilo non ha la navbar superiore con il logo
3. **Mancanza pulsante "Torna all'editor" nella navbar** — Il link "Back to Editor" è solo in fondo alla pagina, non in navbar

## Soluzione

1. Assicurarsi che `user.full_name` sia disponibile al mount del componente profilo (viene già da `useAuth()`)
2. Aggiungere HeaderControls con logo alla pagina profilo
3. Aggiungere link "Torna all'editor" nella navbar, accanto a HeaderControls
