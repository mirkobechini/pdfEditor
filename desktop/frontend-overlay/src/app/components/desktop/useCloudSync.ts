"use client";

import React from "react";
import { isTauri, getApiBaseUrl } from "../../../lib/tauri";

type SyncState = "synced" | "syncing" | "error" | "offline";

interface SyncStateResult {
  state: SyncState;
  lastSyncedAt: string | null;
  syncNow: () => Promise<void>;
}

/**
 * Hook that manages cloud sync state for the desktop app.
 * Uses cookie-based auth (JWT httpOnly cookie set during login).
 */
export function useCloudSync(): SyncStateResult {
  const [state, setState] = React.useState<SyncState>("synced");
  const [lastSyncedAt, setLastSyncedAt] = React.useState<string | null>(null);
  const baseUrl = getApiBaseUrl();

  const checkStatus = React.useCallback(async () => {
    if (!isTauri()) return;
    try {
      const res = await fetch(`${baseUrl}/sync/status`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const status = await res.json();
      setLastSyncedAt(status.last_sync_at ?? null);
    } catch {
      // First time — no sync yet
    }
  }, [baseUrl]);

  const doSync = React.useCallback(async () => {
    if (!isTauri()) return;
    setState("syncing");
    try {
      // Push local PDFs to cloud
      const pushRes = await fetch(`${baseUrl}/sync/push`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfs: [] }),
      });
      if (!pushRes.ok) throw new Error("Push failed");

      // Pull remote PDFs from cloud
      const since = lastSyncedAt
        ? `?since=${encodeURIComponent(lastSyncedAt)}`
        : "";
      const pullRes = await fetch(`${baseUrl}/sync/pull${since}`, {
        credentials: "include",
      });
      if (!pullRes.ok) throw new Error("Pull failed");

      const pullData = await pullRes.json();
      setLastSyncedAt(pullData.synced_at ?? null);
      setState("synced");
    } catch {
      setState("error");
    }
  }, [baseUrl, lastSyncedAt]);

  React.useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  React.useEffect(() => {
    if (!isTauri()) return;
    const handleOnline = () => {
      setState("syncing");
      setTimeout(() => doSync(), 1000);
    };
    const handleOffline = () => setState("offline");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [doSync]);

  return { state, lastSyncedAt, syncNow: doSync };
}
