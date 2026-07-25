use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_store::StoreExt;

struct SidecarState {
    pub child_pid: Mutex<Option<u32>>,
}

/// Spawn the FastAPI sidecar process.
fn start_sidecar(app: &tauri::App) {
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
        .manage(SidecarState {
            child_pid: Mutex::new(None),
        })
        .setup(|app| {
            start_sidecar(app);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                stop_sidecar(window.app_handle());
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
