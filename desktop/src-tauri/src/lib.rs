// Suppress harmless Windows linker messages (dll.lib / dll.exp creation)
#![allow(linker_messages)]

use std::sync::Mutex;
use tauri::Manager;
use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent};
use tauri::menu::{Menu, MenuItem};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_store::StoreExt;

struct SidecarState {
    pub child_pid: Mutex<Option<u32>>,
}

/// Spawn the FastAPI sidecar process.
fn start_sidecar(app: &tauri::App) {
    // If port 7723 already responds, a sidecar is already running (e.g. orphan from a crash).
    // Do NOT spawn a second one — this prevents duplicate fastapi-sidecar processes.
    use std::io::Write;
    use std::net::TcpStream;

    let already_running = TcpStream::connect_timeout(
        &"127.0.0.1:7723".parse().unwrap(),
        std::time::Duration::from_millis(500),
    )
    .map(|mut stream| {
        let _ = write!(stream, "GET /health HTTP/1.0\r\n\r\n");
        true
    })
    .unwrap_or(false);

    if already_running {
        log::info!("Sidecar già in esecuzione sulla porta 7723 — skip spawn.");
        return;
    }

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
    app.state::<SidecarState>().child_pid.lock().unwrap().replace(pid);

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
    let mut pid_opt = None;
    if let Some(state) = app.try_state::<SidecarState>() {
        pid_opt = state.child_pid.lock().unwrap().take();
    }
    if let Some(pid) = pid_opt {
        log::info!("Stopping FastAPI sidecar (PID: {})", pid);
        #[cfg(target_os = "windows")]
        {
            let _ = std::process::Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/F"])
                .output();
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = nix::sys::signal::kill(
                nix::unistd::Pid::from_raw(pid as i32),
                nix::sys::signal::SIGTERM,
            );
        }
    }
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(SidecarState {
            child_pid: Mutex::new(None),
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
                            stop_sidecar(app);
                            app.exit(0);
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
                    stop_sidecar(window.app_handle());
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_sidecar_port,
            store_jwt,
            load_jwt,
            delete_jwt,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
