# Bug: Build v0.1.25 — dialog nativo non funziona nonostante il codice sia presente

## Contesto

La build v0.1.25 include:

- `tauri-plugin-dialog = "2"` in `Cargo.toml`
- `dialog:default` + `dialog:allow-open` in `capabilities/default.json`
- `.plugin(tauri_plugin_dialog::init())` in `lib.rs`
- `import { open } from "@tauri-apps/plugin-dialog"` in `wizard/page.tsx`
- `@tauri-apps/plugin-dialog` in `package.json`

**La build v0.1.25 è RIUSCITA su tutti e 3 gli OS** ✅ — il codice c'è.

**Tuttavia**, alla prova, "Sfoglia…" usa ancora `prompt()` invece del dialog nativo.

## Causa probabile

Il codice in `wizard/page.tsx`:

```typescript
onClick={async () => {
    if (isTauri()) {
        const selected = await open({ directory: true, ... });
        if (selected) setWorkFolder(selected as string);
    } else {
        const folder = prompt("Inserisci il percorso...");
        if (folder) setWorkFolder(folder);
    }
}}
```

**Problema**: Se `isTauri()` torna `true` ma `open()` lancia eccezione (es. plugin dialog non caricato correttamente, o `window.__TAURI__` non completo), **l'eccezione è silenziosa** (nessun try/catch) e l'utente non vede né dialog né prompt.

**Mancanza di try/catch**: Se `open()` fallisce (es. `@tauri-apps/plugin-dialog` importato ma non registrato), l'eccezione muore nell'async callback.

## Fix proposto

Aggiungere try/catch attorno a `open()` per fare fallback a `prompt()`:

```typescript
const selected = await open({ directory: true, ... });
if (selected) setWorkFolder(selected as string);
```

→

```typescript
try {
    const selected = await open({ directory: true, ... });
    if (selected) setWorkFolder(selected as string);
} catch {
    const folder = prompt("Inserisci il percorso...");
    if (folder) setWorkFolder(folder);
}
```

## Priorità

🟡 Media — Il dialog nativo è UX, non blocca. Il fallback a prompt() è funzionale.
