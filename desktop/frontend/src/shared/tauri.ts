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
  return "http://127.0.0.1:7723";
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
