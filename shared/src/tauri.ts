/**
 * Tauri desktop environment detection and helpers.
 *
 * In the desktop app (Tauri webview), the IPC interface is available
 * via window.__TAURI_INTERNALS__ (always present in production).
 * The JS-api packages (@tauri-apps/*) are optional for convenience.
 */

declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
    };
    __TAURI__?: {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
      core?: {
        invoke: (
          cmd: string,
          args?: Record<string, unknown>,
        ) => Promise<unknown>;
      };
      opener?: {
        openUrl: (url: string) => Promise<void>;
      };
      dialog?: {
        open: (options: {
          multiple?: boolean;
          directory?: boolean;
          title?: string;
        }) => Promise<string | string[] | null>;
      };
    };
  }
}

/** Check if the app is running inside Tauri (desktop) vs browser (web). */
export function isTauri(): boolean {
  return (
    typeof window !== "undefined" && window.__TAURI_INTERNALS__ !== undefined
  );
}

/** Get the API base URL depending on environment. */
export function getApiBaseUrl(): string {
  // Desktop (Tauri): the sidecar runs on the local port.
  if (isTauri()) return "http://127.0.0.1:7723";
  // Web: use the configured API URL (same-origin in production, or env override).
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
}

/** Base URL for the cloud backend on Render (auth/register/login). */
export function getCloudApiBaseUrl(): string {
  return "https://pdfeditor-api.mirkobechini.com";
}

/**
 * Invoke a Tauri command safely.
 * Uses window.__TAURI_INTERNALS__ (always available in production).
 * Returns the result or null if not in Tauri environment.
 */
export async function tauriInvoke<T = unknown>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T | null> {
  if (!isTauri()) return null;
  try {
    const result = await window.__TAURI_INTERNALS__!.invoke(cmd, args);
    return result as T;
  } catch {
    return null;
  }
}

/** Open the webview devtools (debugging cloud sync / console errors). */
export async function openDevTools(): Promise<void> {
  await tauriInvoke("open_devtools");
}

/**
 * Open a native file dialog for selecting a PDF file.
 * Returns the file path or null if cancelled (or not in Tauri).
 */
export async function openPdfDialog(): Promise<string | null> {
  if (!isTauri()) return null;
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
 * Returns the file path or null if cancelled (or not in Tauri).
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
 * Returns 7723 fallback when not in Tauri.
 */
export async function getSidecarPort(): Promise<number> {
  if (!isTauri()) return 7723;
  const port = await tauriInvoke<number>("get_sidecar_port");
  return port ?? 7723;
}
