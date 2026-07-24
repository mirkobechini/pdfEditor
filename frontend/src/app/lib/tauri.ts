/**
 * Tauri desktop environment detection and helpers.
 *
 * In the desktop app (Tauri webview), the window object has a `__TAURI__` property.
 * This file provides a clean API to check the environment and invoke Tauri commands.
 */

// Type declaration for Tauri invoke API (available when running in Tauri webview)
declare global {
  interface Window {
    __TAURI__?: {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
      core?: {
        invoke: (
          cmd: string,
          args?: Record<string, unknown>,
        ) => Promise<unknown>;
      };
    };
  }
}

/** Check if the app is running inside Tauri (desktop) vs browser (web). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && window.__TAURI__ !== undefined;
}

/** Get the API base URL depending on environment. */
export function getApiBaseUrl(): string {
  if (isTauri()) {
    // In desktop mode, the FastAPI sidecar runs on localhost:7723
    return "http://127.0.0.1:7723";
  }
  // In web/browser mode, use the env variable or fallback to localhost:8000
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
}

/**
 * Invoke a Tauri command safely.
 * Returns the result or null if not in Tauri environment.
 */
export async function tauriInvoke<T = unknown>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T | null> {
  if (!isTauri()) return null;
  try {
    const api = window.__TAURI__;
    if (api?.invoke) {
      return (await api.invoke(cmd, args)) as T;
    }
    if (api?.core?.invoke) {
      return (await api.core.invoke(cmd, args)) as T;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Open a native file dialog for selecting a PDF file.
 * Returns the file path or null if cancelled.
 */
export async function openPdfDialog(): Promise<string | null> {
  if (!isTauri()) return null;
  // Try the Tauri dialog plugin first
  const result = await tauriInvoke<{ path: string } | null>(
    "plugin:dialog|open",
    {
      filters: [{ name: "PDF", extensions: ["pdf"] }],
      multiple: false,
    },
  );
  return result?.path ?? null;
}

/**
 * Open a native save dialog for saving a file.
 * Returns the file path or null if cancelled.
 */
export async function saveFileDialog(
  defaultName: string,
): Promise<string | null> {
  if (!isTauri()) return null;
  const result = await tauriInvoke<{ path: string } | null>(
    "plugin:dialog|save",
    {
      defaultPath: defaultName,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    },
  );
  return result?.path ?? null;
}

/**
 * Get the sidecar port (invokes Rust command `get_sidecar_port`).
 */
export async function getSidecarPort(): Promise<number> {
  if (!isTauri()) return 7723;
  const port = await tauriInvoke<number>("get_sidecar_port");
  return port ?? 7723;
}
