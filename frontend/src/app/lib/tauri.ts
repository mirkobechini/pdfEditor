/**
 * Re-export from shared (single source of truth).
 * The shared tauri.ts is copied to src/shared/ via the prebuild script.
 */
export {
  isTauri,
  getApiBaseUrl,
  getCloudApiBaseUrl,
  resolveBaseUrl,
  tauriInvoke,
  openDevTools,
  openPdfDialog,
  saveFileDialog,
  getSidecarPort,
} from "../../shared/tauri";
