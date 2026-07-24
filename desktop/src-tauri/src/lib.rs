use std::sync::Mutex;
use tauri::Manager;

struct SidecarState {
    pub child_pid: Mutex<Option<u32>>,
}

/// Spawn the FastAPI sidecar process.
/// Called automatically at app startup.
fn start_sidecar(app: &tauri::App) {
    let sidecar = app.shell().sidecar("fastapi-sidecar")
        .expect("failed to create sidecar command");

    let (mut rx, child) = sidecar
        .spawn()
        .expect("failed to spawn sidecar");

    let pid = child.pid();
    log::info!("FastAPI sidecar started (PID: {})", pid);
    app.state::<SidecarState>().child_pid.lock().unwrap().replace(pid);

    // Log sidecar stdout/stderr
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
fn stop_sidecar(app: &tauri::App) {
    let state = app.state::<SidecarState>();
    if let Some(pid) = state.child_pid.lock().unwrap().take() {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(SidecarState {
            child_pid: Mutex::new(None),
        })
        .setup(|app| {
            start_sidecar(app);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                stop_sidecar(&window.app_handle());
            }
        })
        .invoke_handler(tauri::generate_handler![get_sidecar_port])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
