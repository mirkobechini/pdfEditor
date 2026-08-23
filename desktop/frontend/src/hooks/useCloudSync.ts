/**
 * Hook for managing cloud sync of PDFs on desktop.
 *
 * Handles bidirectional sync (local sidecar ↔ cloud backend),
 * connectivity awareness, and sync mode preferences.
 *
 * Uses a persistent mapping (localStorage) to track which local PDFs
 * have been synced to cloud, since local and cloud assign different IDs.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { cloudApi, api } from "../shared/api";
import type { PdfDocument } from "../shared/types";

// ─── Constants ────────────────────────────────────────────────────

const SYNC_ENABLED_KEY = "pdfeditor_cloud_sync_enabled";
const SYNC_STARTUP_KEY = "pdfeditor_cloud_sync_on_startup";
const SYNC_MAP_KEY = "pdfeditor_sync_id_map";
const SYNC_STATUS_EVENT = "pdfeditor-sync-status-changed";

export type PdfSyncStatus = "pending" | "synced" | "error" | "none";

export interface SyncProgress {
  current: number;
  total: number;
}

interface UseCloudSyncReturn {
  uploadPdf: (
    pdfId: string,
    originalFilename?: string,
  ) => Promise<"uploaded" | "skipped" | "failed">;
  downloadPdf: (pdfId: string, originalFilename?: string) => Promise<boolean>;
  syncAll: () => Promise<{
    uploaded: number;
    downloaded: number;
    skipped: number;
    errors: string[];
  }>;
  status: Record<string, PdfSyncStatus>;
  syncEnabled: boolean;
  setSyncEnabled: (val: boolean) => Promise<void>;
  syncOnStartup: boolean;
  setSyncOnStartup: (val: boolean) => Promise<void>;
  progress: SyncProgress | null;
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncResult: {
    uploaded: number;
    downloaded: number;
    skipped: number;
    errors: string[];
  } | null;
  clearSyncResult: () => void;
  refreshStatus: () => Promise<void>;
}

// ─── Persistent mapping helpers ───────────────────────────────────

function getSyncMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SYNC_MAP_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveSyncMap(localId: string, cloudId: string): void {
  const map = getSyncMap();
  map[localId] = cloudId;
  localStorage.setItem(SYNC_MAP_KEY, JSON.stringify(map));
}

function removeSyncMap(localId: string): void {
  const map = getSyncMap();
  delete map[localId];
  localStorage.setItem(SYNC_MAP_KEY, JSON.stringify(map));
}

function getCloudId(localId: string): string | undefined {
  return getSyncMap()[localId];
}

function getLocalId(cloudId: string): string | undefined {
  const map = getSyncMap();
  return Object.entries(map).find(([, v]) => v === cloudId)?.[0];
}

// ─── Hook ─────────────────────────────────────────────────────────

export function useCloudSync(): UseCloudSyncReturn {
  const [syncEnabled, setSyncEnabledState] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SYNC_ENABLED_KEY) !== "false";
  });
  const [syncOnStartup, setSyncOnStartupState] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(SYNC_STARTUP_KEY) !== "false";
  });
  const [status, setStatus] = useState<Record<string, PdfSyncStatus>>({});
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncResult, setLastSyncResult] = useState<{
    uploaded: number;
    downloaded: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const syncingRef = useRef(false);

  const clearSyncResult = useCallback(() => setLastSyncResult(null), []);

  // Load sync status from the persistent mapping
  const loadStatus = useCallback(async () => {
    if (!syncEnabled) return;
    try {
      let token = cloudApi.getToken();
      for (let i = 0; i < 10 && !token; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        token = cloudApi.getToken();
      }
      if (!token) return;

      const localRes = await api.listPdfs();
      const cloudRes = await cloudApi.listPdfs();
      const cloudIds = new Set(cloudRes.items.map((p) => p.id));
      const map = getSyncMap();
      const newStatus: Record<string, PdfSyncStatus> = {};

      for (const pdf of localRes.items) {
        const mappedCloudId = map[pdf.id];
        if (mappedCloudId && cloudIds.has(mappedCloudId)) {
          newStatus[pdf.id] = "synced";
        } else {
          newStatus[pdf.id] = "none";
        }
      }
      setStatus(newStatus);
    } catch {
      // Cloud not reachable — leave status empty
    }
  }, [syncEnabled]);

  const refreshStatus = useCallback(async () => {
    await loadStatus();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT));
    }
  }, [loadStatus]);

  // Connectivity
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load status on mount
  useEffect(() => {
    if (!syncEnabled) return;
    let cancelled = false;
    (async () => {
      await loadStatus();
    })();
    return () => {
      cancelled = true;
    };
  }, [syncEnabled, loadStatus]);

  // Listen for refresh events from other instances
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      loadStatus();
    };
    window.addEventListener(SYNC_STATUS_EVENT, handler);
    return () => window.removeEventListener(SYNC_STATUS_EVENT, handler);
  }, [loadStatus]);

  const setSyncEnabled = useCallback(async (val: boolean) => {
    setSyncEnabledState(val);
    localStorage.setItem(SYNC_ENABLED_KEY, String(val));
  }, []);

  const setSyncOnStartup = useCallback(async (val: boolean) => {
    setSyncOnStartupState(val);
    localStorage.setItem(SYNC_STARTUP_KEY, String(val));
  }, []);

  const uploadPdf = useCallback(
    async (
      pdfId: string,
      originalFilename?: string,
    ): Promise<"uploaded" | "skipped" | "failed"> => {
      if (!syncEnabled) return "failed";
      try {
        setStatus((prev) => ({ ...prev, [pdfId]: "pending" }));
        const blob = await api.downloadPdf(pdfId);
        const fileName = originalFilename || `${pdfId}.pdf`;
        const file = new File([blob], fileName, { type: "application/pdf" });
        const cloudPdf = await cloudApi.uploadPdf(file);
        // Save mapping: localId → cloudId
        saveSyncMap(pdfId, cloudPdf.id);
        setStatus((prev) => ({ ...prev, [pdfId]: "synced" }));
        return "uploaded";
      } catch (err) {
        const msg = String(err);
        if (
          msg.includes("password") ||
          msg.includes("locked") ||
          msg.includes("protetto")
        ) {
          setStatus((prev) => ({ ...prev, [pdfId]: "none" }));
          return "skipped";
        }
        setStatus((prev) => ({ ...prev, [pdfId]: "error" }));
        return "failed";
      }
    },
    [syncEnabled],
  );

  const downloadPdf = useCallback(
    async (pdfId: string, originalFilename?: string): Promise<boolean> => {
      if (!syncEnabled) return false;
      try {
        setStatus((prev) => ({ ...prev, [pdfId]: "pending" }));
        const blob = await cloudApi.downloadPdf(pdfId);
        const fileName = originalFilename || `${pdfId}.pdf`;
        const file = new File([blob], fileName, { type: "application/pdf" });
        const localPdf = await api.uploadPdf(file);
        // Save mapping: localId → cloudId
        saveSyncMap(localPdf.id, pdfId);
        setStatus((prev) => ({ ...prev, [localPdf.id]: "synced" }));
        return true;
      } catch {
        setStatus((prev) => ({ ...prev, [pdfId]: "error" }));
        return false;
      }
    },
    [syncEnabled],
  );

  const syncAll = useCallback(async (): Promise<{
    uploaded: number;
    downloaded: number;
    skipped: number;
    errors: string[];
  }> => {
    if (syncingRef.current || !syncEnabled)
      return {
        uploaded: 0,
        downloaded: 0,
        skipped: 0,
        errors: ["Sync disabled or already in progress"],
      };
    syncingRef.current = true;
    setIsSyncing(true);
    const result = {
      uploaded: 0,
      downloaded: 0,
      skipped: 0,
      errors: [] as string[],
    };

    try {
      const localRes = await api.listPdfs();
      const localPdfs = localRes.items;
      const cloudRes = await cloudApi.listPdfs();
      const cloudPdfs = cloudRes.items;

      const map = getSyncMap();
      const cloudIds = new Set(cloudPdfs.map((p) => p.id));
      const localIds = new Set(localPdfs.map((p) => p.id));

      const total = localPdfs.length + cloudPdfs.length;
      let current = 0;

      // Upload local PDFs not yet synced to cloud
      for (const pdf of localPdfs) {
        const mappedCloudId = map[pdf.id];
        const alreadyInCloud = mappedCloudId && cloudIds.has(mappedCloudId);
        if (!alreadyInCloud) {
          setProgress({ current, total });
          const uploadResult = await uploadPdf(pdf.id, pdf.original_filename);
          if (uploadResult === "uploaded") result.uploaded++;
          else if (uploadResult === "skipped") result.skipped++;
          else result.errors.push(`Upload failed: ${pdf.original_filename}`);
        }
        current++;
      }

      // Download cloud PDFs not yet synced to local
      for (const pdf of cloudPdfs) {
        const mappedLocalId = getLocalId(pdf.id);
        const alreadyInLocal = mappedLocalId && localIds.has(mappedLocalId);
        if (!alreadyInLocal) {
          setProgress({ current, total });
          const ok = await downloadPdf(pdf.id, pdf.original_filename);
          if (ok) result.downloaded++;
          else result.errors.push(`Download failed: ${pdf.original_filename}`);
        }
        current++;
      }
    } catch (err) {
      result.errors.push(`Sync failed: ${err}`);
    } finally {
      setIsSyncing(false);
      setProgress(null);
      syncingRef.current = false;
      setLastSyncResult(result);
      refreshStatus();
    }

    return result;
  }, [syncEnabled, uploadPdf, downloadPdf]);

  return {
    uploadPdf,
    downloadPdf,
    syncAll,
    status,
    syncEnabled,
    setSyncEnabled,
    syncOnStartup,
    setSyncOnStartup,
    progress,
    isSyncing,
    isOnline,
    lastSyncResult,
    clearSyncResult,
    refreshStatus,
  };
}
