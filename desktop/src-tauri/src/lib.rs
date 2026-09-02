// Suppress harmless Windows linker messages (dll.lib / dll.exp creation)
#![allow(linker_messages)]

use std::sync::Mutex;
use tauri::Manager;
use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent};
use tauri::menu::{Menu, MenuItem};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_store::StoreExt;

struct SidecarState {
    pub child: Mutex<Option<CommandChild>>,
}

/// Spawn the FastAPI sidecar process.
fn start_sidecar(app: &tauri::App) {
    // Kill any orphaned sidecar process from a previous crash that may still
    // hold port 7723. The single-instance plugin prevents multiple app windows,
    // but a crashed instance can leave a zombie sidecar behind.
    kill_by_name();

    // Clean up orphaned PyInstaller _MEI* temp directories left from crashed sidecars.
    // If the sidecar was killed forcefully (taskkill /F), _MEI* dirs remain corrupted
    // and cause "Failed to load Python DLL" on next startup.
    cleanup_mei_temp_dirs();

    let sidecar = app.shell().sidecar("fastapi-sidecar")
        .expect("failed to create sidecar command");

    let (mut rx, child) = sidecar
        .spawn()
        .expect("failed to spawn sidecar");

    let pid = child.pid();
    log::info!("FastAPI sidecar started (PID: {})", pid);
    app.state::<SidecarState>().child.lock().unwrap().replace(child);

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                    log::info!("[sidecar] {}", String::from_utf8_lossy(&line));
                }
                tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                    log::warn!("[sidecar] {}", String::from_utf8_lossy(&line));
                }
                _ => {}
            }
        }
    });
}

/// Clean up orphaned PyInstaller _MEI* temp directories.
fn cleanup_mei_temp_dirs() {
    let tmp_dir = std::env::temp_dir();
    if let Ok(entries) = std::fs::read_dir(&tmp_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                if let Some(name) = path.file_name() {
                    if let Some(name_str) = name.to_str() {
                        if name_str.starts_with("_MEI") {
                            log::info!("Pulizia directory _MEI orfana: {:?}", path);
                            let _ = std::fs::remove_dir_all(&path);
                        }
                    }
                }
            }
        }
    }
}

/// Kill the sidecar process on shutdown.
fn stop_sidecar(app: &tauri::AppHandle) {
    let child_opt = app.try_state::<SidecarState>()
        .and_then(|state| state.child.lock().unwrap().take());

    if let Some(mut child) = child_opt {
        log::info!("Killing sidecar via CommandChild");
        let _ = child.write("app_exit\n".as_bytes());
        std::thread::sleep(std::time::Duration::from_millis(200));
        let _ = child.kill();
    } else {
        log::info!("No child handle — killing sidecar by process name");
        kill_by_name();
    }
    std::thread::sleep(std::time::Duration::from_millis(300));
}

#[cfg(target_os = "windows")]
fn kill_by_name() {
    let _ = std::process::Command::new("taskkill")
        .args(["/F", "/IM", "fastapi-sidecar*"])
        .status();
}

#[cfg(not(target_os = "windows"))]
fn kill_by_name() {
    let _ = std::process::Command::new("pkill")
        .arg("fastapi-sidecar")
        .output();
}

#[tauri::command]
fn get_sidecar_port() -> u16 {
    7723
}

/// Store a JWT token in the desktop app's persistent store.
#[tauri::command]
fn store_jwt(app: tauri::AppHandle, token: String) -> Result<(), String> {
    let store = app.store("auth.json").map_err(|e| format!("Failed to open store: {}", e))?;
    store.set("jwt", serde_json::Value::String(token));
    store.save().map_err(|e| format!("Failed to save store: {}", e))?;
    log::info!("JWT stored successfully");
    Ok(())
}

/// Load the stored JWT token from the desktop app's persistent store.
#[tauri::command]
fn load_jwt(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let store = app.store("auth.json").map_err(|e| format!("Failed to open store: {}", e))?;
    let value = store.get("jwt");
    match value {
        Some(serde_json::Value::String(token)) => {
            log::info!("JWT loaded from store");
            Ok(Some(token.clone()))
        }
        _ => Ok(None),
    }
}

/// Delete the stored JWT token from the desktop app's persistent store.
#[tauri::command]
fn delete_jwt(app: tauri::AppHandle) -> Result<(), String> {
    let store = app.store("auth.json").map_err(|e| format!("Failed to open store: {}", e))?;
    store.delete("jwt");
    store.save().map_err(|e| format!("Failed to save store: {}", e))?;
    log::info!("JWT deleted from store");
    Ok(())
}

/// Read a binary file from the given path and return its contents.
#[tauri::command]
fn read_file_binary(path: String) -> Result<Vec<u8>, String> {
    use std::fs;
    fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))
}

/// Open a native file dialog with an optional default path.
#[tauri::command]
fn dialog_open(app: tauri::AppHandle, default_path: Option<String>) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let mut builder = app.dialog()
        .file()
        .add_filter("PDF", &["pdf"]);

    if let Some(ref path) = default_path {
        builder = builder.set_directory(path);
    }

    match builder.blocking_pick_file() {
        Some(file_path) => {
            let path = file_path.into_path().map_err(|e| format!("Failed to resolve path: {}", e))?;
            Ok(Some(path.to_string_lossy().to_string()))
        }
        None => Ok(None),
    }
}

/// Open a native folder picker dialog.
#[tauri::command]
fn dialog_open_folder(app: tauri::AppHandle, default_path: Option<String>) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let mut builder = app.dialog().file();

    if let Some(ref path) = default_path {
        builder = builder.set_directory(path);
    }

    match builder.blocking_pick_folder() {
        Some(folder_path) => {
            let path = folder_path.into_path().map_err(|e| format!("Failed to resolve path: {}", e))?;
            Ok(Some(path.to_string_lossy().to_string()))
        }
        None => Ok(None),
    }
}

/// Open a native save dialog and write the provided bytes to the chosen path.
/// Returns the path where the file was saved, or None if cancelled.
#[tauri::command]
fn dialog_save(app: tauri::AppHandle, default_name: String, data: Vec<u8>, default_folder: Option<String>) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    use std::fs;

    // Make sure the filename ends with .pdf
    let name = if default_name.ends_with(".pdf") {
        default_name
    } else {
        format!("{}.pdf", default_name)
    };

    let mut builder = app.dialog()
        .file()
        .add_filter("PDF", &["pdf"])
        .set_file_name(&name);

    // Set default folder if provided
    if let Some(ref folder) = default_folder {
        let path = std::path::Path::new(folder);
        if path.exists() {
            builder = builder.set_directory(path);
        }
    }

    match builder.blocking_save_file() {
        Some(file_path) => {
            let path = file_path.into_path().map_err(|e| format!("Failed to resolve path: {}", e))?;
            fs::write(&path, &data).map_err(|e| format!("Failed to write file: {}", e))?;
            log::info!("PDF salvato in: {:?}", path);
            Ok(Some(path.to_string_lossy().to_string()))
        }
        None => Ok(None),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(SidecarState {
            child: Mutex::new(None),
        })
        .setup(|app| {
            // Register single-instance plugin: second instance focuses the running one
            #[cfg(desktop)]
            {
                app.handle().plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
                    let _ = app.get_webview_window("main")
                        .expect("no main window")
                        .set_focus();
                })).expect("failed to register single-instance plugin");
            }

            start_sidecar(app);

            // Build tray menu
            let show_item = MenuItem::with_id(app, "show", "Mostra PdfEditor", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Esci", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            // Build system tray icon
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("PdfEditor — in esecuzione")
                .menu(&menu)
                .on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            log::info!("Exiting app — killing sidecar and exiting process");
                            // Kill sidecar child handle
                            if let Some(state) = app.try_state::<SidecarState>() {
                                if let Some(mut child) = state.child.lock().unwrap().take() {
                                    let _ = child.kill();
                                }
                            }
                            std::thread::sleep(std::time::Duration::from_millis(300));
                            // Force-kill any remaining fastapi-sidecar processes
                            #[cfg(target_os = "windows")]
                            {
                                let _ = std::process::Command::new("taskkill")
                                    .args(["/F", "/IM", "fastapi-sidecar*"])
                                    .status();
                            }
                            // Exit the entire process immediately — kills all children
                            std::process::exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    // Hide window instead of closing — keep sidecar alive
                    let _ = window.hide();
                    api.prevent_close();
                }
                tauri::WindowEvent::Destroyed => {
                    // Cleanup: kill sidecar by name (child handle might already be gone)
                    log::info!("Window destroyed — killing sidecar by name");
                    #[cfg(target_os = "windows")]
                    {
                        let _ = std::process::Command::new("taskkill")
                            .args(["/F", "/IM", "fastapi-sidecar*"])
                            .status();
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_sidecar_port,
            store_jwt,
            load_jwt,
            delete_jwt,
            read_file_binary,
            dialog_open,
            dialog_open_folder,
            dialog_save,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_sidecar_port() {
        assert_eq!(get_sidecar_port(), 7723);
    }

    #[test]
    fn test_read_file_binary_nonexistent() {
        let result = read_file_binary("/nonexistent/path/file.pdf".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn test_read_file_binary_success() {
        use std::io::Write;
        let dir = std::env::temp_dir().join("pdfeditor_test");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("test_read.pdf");
        let mut f = std::fs::File::create(&path).unwrap();
        f.write_all(b"%PDF-test-content").unwrap();
        drop(f);

        let result = read_file_binary(path.to_string_lossy().to_string());
        assert!(result.is_ok());
        let bytes = result.unwrap();
        assert_eq!(bytes, b"%PDF-test-content");

        std::fs::remove_file(&path).unwrap();
        std::fs::remove_dir(&dir).unwrap();
    }
}
