# Bug: Upload PDF — Network error + drag-drop non funziona

**Status:** Open
**Priority:** HIGH
**Complexity:** Medium

## Problemi

1. **Upload da sidebar** — "Caricamento fallito: Error: Network error"
   - `uploadPdfWithProgress` usa `XMLHttpRequest` che NON imposta `withCredentials: true`
   - Il cookie `access_token` non viene inviato → backend restituisce 401 → errore generico "Network error"

2. **Drag-drop al centro** — Nessun handler drag-drop nella pagina principale

## Soluzione

### 1. Fix XHR upload

Aggiungere `xhr.withCredentials = true` in `api.ts`:

```tsx
const xhr = new XMLHttpRequest();
xhr.withCredentials = true;
```

### 2. Fix upload semplice

Anche `uploadPdf()` usa `this._fetch()`? Verificare che ora usi `this._fetch()` con credentials: 'include'.

### 3. Drag-drop sul viewer

Aggiungere handler onDragOver/onDrop nella pagina principale (`app/page.tsx`) che propaga il file alla sidebar o fa upload diretto.
