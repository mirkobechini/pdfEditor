/**
 * Core helpers for useCloudSync: persistent id mapping, preference keys and
 * cloud-token retry. Extracted to keep the hook under 400 lines (file lunghi,
 * refactor/long-files-t6-desktophooks).
 *
 * The mapping lives in localStorage because local and cloud assign different
 * IDs to the same PDF.
 */
import { cloudApi, api } from "../shared/api";

export const SYNC_ENABLED_KEY = "pdfeditor_cloud_sync_enabled";
export const SYNC_STARTUP_KEY = "pdfeditor_cloud_sync_on_startup";
export const SYNC_MAP_KEY = "pdfeditor_sync_id_map";
export const SYNC_STATUS_EVENT = "pdfeditor-sync-status-changed";

// ─── Persistent mapping helpers ───────────────────────────────────

export function getSyncMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SYNC_MAP_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveSyncMap(localId: string, cloudId: string): void {
  const map = getSyncMap();
  map[localId] = cloudId;
  localStorage.setItem(SYNC_MAP_KEY, JSON.stringify(map));
}

export function removeSyncMap(localId: string): void {
  const map = getSyncMap();
  delete map[localId];
  localStorage.setItem(SYNC_MAP_KEY, JSON.stringify(map));
}

export function getCloudId(localId: string): string | undefined {
  return getSyncMap()[localId];
}

export function getLocalId(cloudId: string): string | undefined {
  const map = getSyncMap();
  return Object.entries(map).find(([, v]) => v === cloudId)?.[0];
}

// ─── Delete sources ────────────────────────────────────────────────

/**
 * Deletes a PDF from the requested sources (local / cloud / both),
 * ignoring individual source failures (matching the previous inline
 * behaviour which swallowed per-source errors).
 */
export async function deletePdfFromSources(
  pdfId: string,
  option: "local" | "cloud" | "both",
): Promise<void> {
  if (option === "cloud" || option === "both") {
    // Delete from cloud using the mapped cloud ID
    const mappedCloudId = getCloudId(pdfId);
    if (mappedCloudId) {
      try {
        await cloudApi.deletePdf(mappedCloudId);
      } catch {
        /* cloud delete failed — ignore */
      }
    }
  }

  if (option === "local" || option === "both") {
    // Delete locally
    try {
      await api.deletePdf(pdfId);
    } catch {
      /* local delete failed — ignore */
    }
  }
}

// ─── localStorage-backed preference initializers ──────────────────

export function readSyncEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SYNC_ENABLED_KEY) !== "false";
}

export function readSyncOnStartup(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SYNC_STARTUP_KEY) !== "false";
}