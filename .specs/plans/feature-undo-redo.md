# Feature: Undo/Redo per modifiche PDF

## Obiettivo

Implementare cronologia undo/redo lato server con snapshot del PDF prima di ogni operazione di modifica, e pulsanti Undo/Redo nella toolbar lato client.

## Dipendenze

- Backend API PDF operanti (merge, split, reorder, text, metadata) ✅

## Stack

- PyMuPDF (fitz)
- FastAPI
- File system (snapshot storage)

## Output atteso

- `POST /pdf/{id}/undo` — ripristina snapshot precedente
- `POST /pdf/{id}/redo` — riapplica operazione annullata
- Max 10 snapshot per sessione (configurabile)
- Salvataggio esplicito resetta cronologia
- Pulsanti Undo/Redo nella toolbar frontend con shortcut Ctrl+Z / Ctrl+Shift+Z

## Status

[x] Completata
**Completata il:** 2026-06-27
**Note:** Snapshot storage in `storage.py` con prune a max 10. `_create_snapshot()` chiamato in split, reorder, remove-pages, replace-text, edit-metadata. Due stack undo/redo separati. Pulsanti ↩↪ con Ctrl+Z/Ctrl+Shift+Z. 193 test passanti. (PR #98, issue #97)
