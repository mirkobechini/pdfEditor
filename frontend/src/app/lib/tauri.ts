/**
 * Re-export from shared (single source of truth).
 * The shared tauri.ts is copied to src/shared/ via the prebuild script.
 */
export {
  isTauri,
  getApiBaseUrl,
  getCloudApiBaseUrl,
  tauriInvoke,
  openDevTools,
  openPdfDialog,
  saveFileDialog,
  getSidecarPort,
} from "../../shared/tauri";
