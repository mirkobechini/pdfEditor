/**
 * Hook for managing cloud sync of PDFs on desktop.
 *
 * Handles bidirectional sync (local sidecar ↔ cloud backend),
 * connectivity awareness, and sync mode preferences.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { cloudApi, api } from "../shared/api";
import type { PdfDocument } from "../shared/types";

// ─── Constants ────────────────────────────────────────────────────

const SYNC_ENABLED_KEY = "pdfeditor_cloud_sync_enabled";
const SYNC_STARTUP_KEY = "pdfeditor_cloud_sync_on_startup";

export type PdfSyncStatus = "pending" | "synced" | "error" | "none";

export interface SyncProgress {
  current: number;
  total: number;
}

interface UseCloudSyncReturn {
  /** Upload a single PDF to cloud */
  uploadPdf: (pdfId: string) => Promise<"uploaded" | "skipped" | "failed">;
  /** Download a single PDF from cloud */
  downloadPdf: (pdfId: string, originalFilename?: string) => Promise<boolean>;
  /** Full bidirectional sync */
  syncAll: () => Promise<{
    uploaded: number;
    downloaded: number;
    skipped: number;
    errors: string[];
  }>;
  /** Sync status per PDF (map of pdfId → status) */
  status: Record<string, PdfSyncStatus>;
  /** Whether sync is enabled */
  syncEnabled: boolean;
  /** Set sync enabled/disabled */
  setSyncEnabled: (val: boolean) => Promise<void>;
  /** Sync on startup toggle */
  syncOnStartup: boolean;
  /** Set sync on startup */
  setSyncOnStartup: (val: boolean) => Promise<void>;
  /** Progress during sync */
  progress: SyncProgress | null;
  /** Whether currently syncing */
  isSyncing: boolean;
  /** Whether device is online */
  isOnline: boolean;
  /** Last sync result (cleared after read) */
  lastSyncResult: {
    uploaded: number;
    downloaded: number;
    skipped: number;
    errors: string[];
  } | null;
  /** Clear last sync result */
  clearSyncResult: () => void;
}

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

  // Listen to connectivity changes
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

  // Load sync status on mount: compare local PDFs with cloud PDFs
  useEffect(() => {
    if (!syncEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        // Wait for cloud token (auth might still be loading) — retry up to 10s
        let token = cloudApi.getToken();
        for (let i = 0; i < 10 && !token; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          if (cancelled) return;
          token = cloudApi.getToken();
        }
        if (!token) return; // Still no token — skip

        const localRes = await api.listPdfs();
        const cloudRes = await cloudApi.listPdfs();
        if (cancelled) return;
        const cloudIds = new Set(cloudRes.items.map((p) => p.id));
        const newStatus: Record<string, PdfSyncStatus> = {};
        for (const pdf of localRes.items) {
          newStatus[pdf.id] = cloudIds.has(pdf.id) ? "synced" : "none";
        }
        setStatus(newStatus);
      } catch {
        // Cloud not reachable — leave status empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [syncEnabled]);

  const setSyncEnabled = useCallback(async (val: boolean) => {
    setSyncEnabledState(val);
    localStorage.setItem(SYNC_ENABLED_KEY, String(val));
  }, []);

  const setSyncOnStartup = useCallback(async (val: boolean) => {
    setSyncOnStartupState(val);
    localStorage.setItem(SYNC_STARTUP_KEY, String(val));
  }, []);

  const uploadPdf = useCallback(
    async (pdfId: string): Promise<"uploaded" | "skipped" | "failed"> => {
      if (!syncEnabled) return "failed";
      try {
        setStatus((prev) => ({ ...prev, [pdfId]: "pending" }));
        const blob = await api.downloadPdf(pdfId);
        const file = new File([blob], "temp.pdf", { type: "application/pdf" });
        await cloudApi.uploadPdf(file);
        setStatus((prev) => ({ ...prev, [pdfId]: "synced" }));
        return "uploaded";
      } catch (err) {
        // Skip password-protected PDFs gracefully
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
        await api.uploadPdf(file);
        setStatus((prev) => ({ ...prev, [pdfId]: "synced" }));
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
      // Get local PDFs
      const localRes = await api.listPdfs();
      const localPdfs = localRes.items;

      // Get cloud PDFs
      const cloudRes = await cloudApi.listPdfs();
      const cloudPdfs = cloudRes.items;

      const localIds = new Set(localPdfs.map((p) => p.id));
      const cloudIds = new Set(cloudPdfs.map((p) => p.id));

      const total = localPdfs.length + cloudPdfs.length;
      let current = 0;

      // Upload local PDFs not in cloud
      for (const pdf of localPdfs) {
        if (!cloudIds.has(pdf.id)) {
          setProgress({ current, total });
          const uploadResult = await uploadPdf(pdf.id);
          if (uploadResult === "uploaded") result.uploaded++;
          else if (uploadResult === "skipped") result.skipped++;
          else result.errors.push(`Upload failed: ${pdf.original_filename}`);
        }
        current++;
      }

      // Download cloud PDFs not in local
      for (const pdf of cloudPdfs) {
        if (!localIds.has(pdf.id)) {
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
  };
}
