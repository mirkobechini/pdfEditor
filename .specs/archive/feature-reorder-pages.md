# Feature: Reorder Pages dialog (Desktop)

**Issue:** #654
**Status:** Non iniziata

## Obiettivo

Sostituire il bottone 'Reorder' mock nell'header dell'editor con un dialog funzionante.

## API

- `POST /pdfs/{id}/reorder` — `api.reorderPages(id, pageOrder, outputFilename?)`

## Commit previsti

1. `feat(desktop): add ReorderPagesModal component with drag/reorder`
2. `feat(desktop): wire Reorder button in editor header`

## Acceptance criteria

- [ ] Cliccando Reorder si apre un modale con anteprime pagine
- [ ] Si possono spostare pagine su/giù
- [ ] Supporta filename e overwrite
- [ ] Dopo salvataggio, il viewer si aggiorna
