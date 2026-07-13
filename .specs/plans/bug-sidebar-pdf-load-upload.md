# Bug: Sidebar — "Caricamento PDF fallito" + upload non funziona

**Status:** Open
**Priority:** HIGH
**Complexity:** Medium

## Problemi

1. **Lista PDF non caricata** — Sidebar mostra "Caricamento PDF fallito" (`loadFailed`). La chiamata `GET /pdfs` probabilmente fallisce perché il token non è ancora stato impostato via cookie dopo il fix `credentials: 'include'`.
2. **Upload via drag-drop non funziona** — Droppare un file nell'area centrale non fa nulla perché manca un handler `onDrop` nel viewer/page principale.
3. **Upload via sidebar "Network error"** — `uploadPdfWithProgress` usa XHR senza `withCredentials`, quindi il cookie non viene inviato.

## Soluzione

### 1. Sidebar load fails

- Verificare che `api.listPdfs()` riceva il cookie e che `GET /pdfs` funzioni
- Potrebbe essere un problema di endpoint (`/pdfs` vs `/pdfs/`)

### 2. Drag-drop sul viewer

- Aggiungere handler drag-drop nella pagina principale (`app/page.tsx`) che propaga il file alla sidebar

### 3. XHR upload senza `withCredentials`

- `uploadPdfWithProgress` usa `XMLHttpRequest` che NON invia i cookie
- Aggiungere `xhr.withCredentials = true`
