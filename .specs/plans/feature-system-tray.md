# Feature: System tray (minimize to tray on close)

## Obiettivo

Quando l'utente chiude la finestra dell'app desktop, questa non si chiude ma rimane in esecuzione come icona nella tray bar (sistema) di Windows/macOS/Linux. Cliccando sull'icona si riapre la finestra.

## Contesto

L'app desktop Tauri avvia un sidecar FastAPI che impiega ~8s per essere pronto. Chiudere la finestra significa killare il sidecar e dover riavviare tutto da capo. La tray permette di tenere l'app in background senza ricaricare il backend.

## Comportamento atteso

| Azione                    | Comportamento                              |
| ------------------------- | ------------------------------------------ |
| Clicca X in alto a destra | Finestra si nasconde → icona nella tray    |
| Clicca icona tray         | Finestra si riapre / porta in primo piano  |
| Click destro icona tray   | Menu contestuale: "Apri PdfEditor", "Esci" |
| "Esci" dal menu tray      | Chiude la finestra + kill sidecar + esce   |
| Doppio click icona tray   | Finestra si riapre (bonus)                 |
| Tooltip sull'icona        | "PdfEditor — in esecuzione"                |

## Stack

- **Tauri v2** — `TrayIconBuilder` API built-in (nessun plugin extra)
- **Icona:** `desktop/src-tauri/icons/icon.ico` (Windows) / `icon.png` (macOS/Linux)

## Modifiche necessarie

### 1. Rust (`desktop/src-tauri/src/lib.rs`)

Aggiungere `use tauri::tray::TrayIconBuilder;` e configurare nel `Builder`:

```rust
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::menu::{Menu, MenuItem};

// In .setup(|app| { ... })
.tray(|app| {
    let show_item = MenuItem::with_id(app, "show", "Mostra PdfEditor", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Esci", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("PdfEditor — in esecuzione")
        .menu(&menu)
        .on_menu_event(move |app, event| {
            match event.id.as_ref() {
                "show" => { /* riapri finestra */ }
                "quit" => { /* kill sidecar + esci */ }
                _ => {}
            }
        })
        .build()
})?;
```

### 2. Window close behavior

Sostituire `on_window_event` `Destroyed` con `CloseRequested`:

```rust
.on_window_event(|window, event| {
    match event {
        tauri::WindowEvent::CloseRequested { api, .. } => {
            // Hide window instead of closing
            let _ = window.hide();
            api.prevent_close();
        }
        tauri::WindowEvent::Destroyed => {
            stop_sidecar(window.app_handle());
        }
        _ => {}
    }
})
```

### 3. Frontend (`desktop/frontend/`)

Nessuna modifica al frontend — il comportamento tray è gestito interamente dal layer Rust.

### 4. Capabilities

Nessun permesso aggiuntivo necessario — tray è built-in in Tauri v2.

### 5. Icona tray

Verificare che l'icona `icon.ico` (Windows) e `icon.png` (macOS/Linux) siano presenti in `desktop/src-tauri/icons/`. Già esistono per il window icon.

## Dipendenze

Nessuna nuova dipendenza — TrayIconBuilder è parte del core di Tauri v2.

## Output atteso

- [ ] Windows: icona nella system tray vicino all'orologio
- [ ] macOS: icona nella menu bar (in alto a destra)
- [ ] Linux: icona nel system tray (dipende dal DE)
- [ ] Click X → finestra nascosta → icona tray
- [ ] Click icona → finestra riappare
- [ ] Click destro → menu "Mostra PdfEditor" / "Esci"
- [ ] "Esci" → kill sidecar + chiusura completa
- [ ] Sidecar NON viene killato quando si nasconde la finestra

## Note

- Su macOS l'icona nella menu bar dovrebbe essere piccola (16x16 o 22x22). Potrebbe servire una versione monochrome/adattata.
- Su alcune distribuzioni Linux, il tray potrebbe non funzionare senza `libayatana-appindicator`. Già presente nelle deps.
- La funzione `hide()` nasconde la finestra ma la mantiene in memoria. `show()` + `set_focus()` la riporta in primo piano.

## Status

[x] Non iniziata
