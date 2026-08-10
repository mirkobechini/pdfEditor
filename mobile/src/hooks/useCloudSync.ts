/**
 * Hook for managing cloud sync of PDFs.
 *
 * Handles bidirectional sync (local ↔ cloud), conflict detection,
 * connectivity awareness, and sync mode preferences.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { File, Directory, Paths } from "expo-file-system";
import { api } from "../shared/api";
import type { LocalPdf } from "../shared/types";
import {
  getLocalPdfById,
  savePdfLocally,
  getUnsyncedPdfs,
  markPdfCloudSynced,
  markPdfCloudUnsynced,
  deleteLocalPdf,
} from "../services/localDb";
import { useAuth } from "../shared/auth";

// ─── Constants ────────────────────────────────────────────────────

const SYNC_ENABLED_KEY = "cloud_sync_enabled";
const SYNC_MODE_KEY = "cloud_sync_mode";
const SYNC_STARTUP_KEY = "cloud_sync_on_startup";

export type SyncMode = "differito" | "auto" | "ibrido" | "chiedi";
export type PdfSyncStatus = "pending" | "synced" | "error" | "none";

export interface SyncProgress {
  current: number;
  total: number;
}

export interface PendingChange {
  pdf: LocalPdf;
  operation: "upload" | "download";
  reason: string;
}

export interface SyncConflict {
  pdfId: string;
  pdfName: string;
  local: {
    updated_at: string;
    file_size: number;
  };
  cloud: {
    updated_at: string;
    file_size: number;
  };
}

interface UseCloudSyncReturn {
  /** Upload a single PDF to cloud */
  uploadPdf: (pdfId: string) => Promise<boolean>;
  /** Download a single PDF from cloud */
  downloadPdf: (pdfId: string) => Promise<boolean>;
  /** Full bidirectional sync */
  syncAll: () => Promise<{
    uploaded: number;
    downloaded: number;
    conflicts: SyncConflict[];
    errors: string[];
  }>;
  /** Get list of pending changes (for preview before sync) */
  getPendingChanges: () => Promise<{
    uploads: PendingChange[];
    downloads: PendingChange[];
    total: number;
  }>;
  /** Sync status per PDF (map of pdfId → status) */
  status: Record<string, PdfSyncStatus>;
  /** Whether sync is enabled */
  syncEnabled: boolean;
  /** Set sync enabled/disabled */
  setSyncEnabled: (val: boolean) => Promise<void>;
  /** Sync mode preference */
  syncMode: SyncMode;
  /** Set sync mode */
  setSyncMode: (mode: SyncMode) => Promise<void>;
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
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

export function useCloudSync(): UseCloudSyncReturn {
  const { user } = useAuth();
  const isGuest = !user || (user as any).is_guest === true;

  const [syncEnabled, setSyncEnabledState] = useState(false);
  const [syncMode, setSyncModeState] = useState<SyncMode>("differito");
  const [syncOnStartup, setSyncOnStartupState] = useState(true);
  const [status, setStatus] = useState<Record<string, PdfSyncStatus>>({});
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const syncingRef = useRef(false);

  // Load preferences on mount
  useEffect(() => {
    (async () => {
      const enabled = await AsyncStorage.getItem(SYNC_ENABLED_KEY);
      setSyncEnabledState(enabled === null ? true : enabled === "true");

      const mode = await AsyncStorage.getItem(SYNC_MODE_KEY);
      setSyncModeState((mode as SyncMode) || "differito");

      const startup = await AsyncStorage.getItem(SYNC_STARTUP_KEY);
      setSyncOnStartupState(startup === null ? true : startup === "true");
    })();
  }, []);

  // Listen to connectivity changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? true);
    });
    return () => unsubscribe();
  }, []);

  const setSyncEnabled = useCallback(async (val: boolean) => {
    setSyncEnabledState(val);
    await AsyncStorage.setItem(SYNC_ENABLED_KEY, String(val));
  }, []);

  const setSyncMode = useCallback(async (mode: SyncMode) => {
    setSyncModeState(mode);
    await AsyncStorage.setItem(SYNC_MODE_KEY, mode);
  }, []);

  const setSyncOnStartup = useCallback(async (val: boolean) => {
    setSyncOnStartupState(val);
    await AsyncStorage.setItem(SYNC_STARTUP_KEY, String(val));
  }, []);

  const uploadPdf = useCallback(
    async (pdfId: string): Promise<boolean> => {
      if (isGuest || !syncEnabled) return false;
      try {
        setStatus((prev) => ({ ...prev, [pdfId]: "pending" }));
        const pdf = await getLocalPdfById(pdfId);
        if (!pdf) throw new Error("PDF not found locally");

        const file = new File(pdf.uri);
        if (!(await file.exists)) throw new Error("PDF file not found on disk");

        await api.uploadPdf(pdf.uri, pdf.original_filename, "application/pdf");
        await markPdfCloudSynced(pdfId);
        setStatus((prev) => ({ ...prev, [pdfId]: "synced" }));
        return true;
      } catch (err) {
        setStatus((prev) => ({ ...prev, [pdfId]: "error" }));
        return false;
      }
    },
    [isGuest, syncEnabled],
  );

  const downloadPdf = useCallback(
    async (pdfId: string): Promise<boolean> => {
      if (isGuest || !syncEnabled) return false;
      try {
        setStatus((prev) => ({ ...prev, [pdfId]: "pending" }));
        const blob = await api.downloadPdf(pdfId);
        const localId = generateId();
        const pdfDir = new Directory(Paths.document, "pdfs");
        const destUri = pdfDir.path + "/" + localId + ".pdf";

        // Convert blob to base64 and write
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        if (!(await pdfDir.exists)) await pdfDir.create();

        const file = new File(destUri);
        await file.write(base64, "base64");

        // Get cloud PDF metadata
        const cloudPdf = await api.getPdf(pdfId);

        await savePdfLocally({
          id: localId,
          user_id: user?.id ?? "",
          original_filename: cloudPdf.original_filename,
          file_size: blob.size,
          page_count: cloudPdf.page_count || 0,
          title: cloudPdf.title,
          author: cloudPdf.author,
          uri: destUri,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          cloud_synced: 1,
          cloud_synced_at: new Date().toISOString(),
        });

        setStatus((prev) => ({ ...prev, [pdfId]: "synced" }));
        return true;
      } catch (err) {
        setStatus((prev) => ({ ...prev, [pdfId]: "error" }));
        return false;
      }
    },
    [isGuest, syncEnabled, user?.id],
  );

  const getPendingChanges = useCallback(async (): Promise<{
    uploads: PendingChange[];
    downloads: PendingChange[];
    total: number;
  }> => {
    if (isGuest || !syncEnabled) {
      return { uploads: [], downloads: [], total: 0 };
    }

    const uploads: PendingChange[] = [];
    const downloads: PendingChange[] = [];

    // Local PDFs not yet synced
    const unsyncedLocal = await getUnsyncedPdfs();
    for (const pdf of unsyncedLocal) {
      uploads.push({
        pdf,
        operation: "upload",
        reason: "Non ancora caricato sul cloud",
      });
    }

    // Cloud PDFs not present locally
    try {
      const cloudList = await api.listPdfs(0, 1000);
      if (cloudList?.pdfs) {
        for (const cloudPdf of cloudList.pdfs) {
          const local = await getLocalPdfById(cloudPdf.id);
          if (!local) {
            downloads.push({
              pdf: {
                id: cloudPdf.id,
                original_filename: cloudPdf.original_filename,
                file_size: cloudPdf.file_size,
                page_count: cloudPdf.page_count || 0,
                title: cloudPdf.title,
                author: cloudPdf.author,
                uri: "",
                created_at: cloudPdf.created_at,
                updated_at: cloudPdf.updated_at,
                cloud_synced: 1,
                cloud_synced_at: cloudPdf.updated_at,
              },
              operation: "download",
              reason: "Presente solo sul cloud",
            });
          }
        }
      }
    } catch {
      // Cannot reach cloud — skip downloads
    }

    return { uploads, downloads, total: uploads.length + downloads.length };
  }, [isGuest, syncEnabled]);

  const syncAll = useCallback(async (): Promise<{
    uploaded: number;
    downloaded: number;
    conflicts: SyncConflict[];
    errors: string[];
  }> => {
    if (syncingRef.current)
      return { uploaded: 0, downloaded: 0, conflicts: [], errors: [] };
    if (isGuest || !syncEnabled || !isOnline) {
      return { uploaded: 0, downloaded: 0, conflicts: [], errors: [] };
    }

    syncingRef.current = true;
    setIsSyncing(true);

    let uploaded = 0;
    let downloaded = 0;
    const conflicts: SyncConflict[] = [];
    const errors: string[] = [];

    try {
      // Step 1: Locale → Cloud (unsynced PDFs)
      const unsyncedLocal = await getUnsyncedPdfs();
      setProgress({ current: 0, total: unsyncedLocal.length + 1 });

      for (let i = 0; i < unsyncedLocal.length; i++) {
        const pdf = unsyncedLocal[i];
        setProgress({ current: i + 1, total: unsyncedLocal.length + 1 });
        try {
          const file = new File(pdf.uri);
          if (!(await file.exists)) {
            errors.push(`${pdf.original_filename}: file not found on disk`);
            continue;
          }
          await api.uploadPdf(
            pdf.uri,
            pdf.original_filename,
            "application/pdf",
          );
          await markPdfCloudSynced(pdf.id);
          setStatus((prev) => ({ ...prev, [pdf.id]: "synced" }));
          uploaded++;
        } catch (err) {
          errors.push(`${pdf.original_filename}: upload failed`);
          setStatus((prev) => ({ ...prev, [pdf.id]: "error" }));
        }
      }

      // Step 2: Cloud → Locale (cloud PDFs not in local)
      setProgress({
        current: unsyncedLocal.length + 1,
        total: unsyncedLocal.length + 1,
      });
      try {
        const cloudList = await api.listPdfs(0, 1000);
        if (cloudList?.pdfs) {
          const totalSteps = unsyncedLocal.length + cloudList.pdfs.length;
          setProgress({ current: unsyncedLocal.length, total: totalSteps });

          for (let i = 0; i < cloudList.pdfs.length; i++) {
            const cloudPdf = cloudList.pdfs[i];
            setProgress({
              current: unsyncedLocal.length + i + 1,
              total: totalSteps,
            });

            const local = await getLocalPdfById(cloudPdf.id);

            if (!local) {
              // Not in local → download
              try {
                const ok = await downloadPdf(cloudPdf.id);
                if (ok) downloaded++;
              } catch {
                errors.push(`${cloudPdf.original_filename}: download failed`);
              }
            } else if (
              local.cloud_synced === 1 &&
              local.cloud_synced_at &&
              local.updated_at !== cloudPdf.updated_at
            ) {
              // Conflict: same PDF, different versions
              conflicts.push({
                pdfId: cloudPdf.id,
                pdfName: cloudPdf.original_filename,
                local: {
                  updated_at: local.updated_at,
                  file_size: local.file_size,
                },
                cloud: {
                  updated_at: cloudPdf.updated_at,
                  file_size: cloudPdf.file_size,
                },
              });
              setStatus((prev) => ({ ...prev, [cloudPdf.id]: "pending" }));
            }
          }
        }
      } catch {
        errors.push("Failed to fetch cloud PDF list");
      }
    } finally {
      setProgress(null);
      setIsSyncing(false);
      syncingRef.current = false;
    }

    return { uploaded, downloaded, conflicts, errors };
  }, [isGuest, syncEnabled, isOnline, downloadPdf]);

  return {
    uploadPdf,
    downloadPdf,
    syncAll,
    getPendingChanges,
    status,
    syncEnabled,
    setSyncEnabled,
    syncMode,
    setSyncMode,
    syncOnStartup,
    setSyncOnStartup,
    progress,
    isSyncing,
    isOnline,
  };
}
