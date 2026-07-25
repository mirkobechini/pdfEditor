"use client";

import React from "react";
import { isTauri, tauriInvoke } from "../../lib/tauri";

const STORE_KEY = "auth_offline_token";

/**
 * Save the offline token to Tauri persistent store.
 * Returns true if successful, false if not in Tauri environment.
 */
export async function saveOfflineToken(token: string): Promise<boolean> {
  if (!isTauri()) return false;
  const result = await tauriInvoke("store_jwt", { token });
  return result !== null;
}

/**
 * Load the offline token from Tauri persistent store.
 * Returns the token string or null if not stored / not in Tauri.
 */
export async function loadOfflineToken(): Promise<string | null> {
  if (!isTauri()) return null;
  const result = await tauriInvoke<string>("load_jwt");
  return result ?? null;
}

/**
 * Delete the offline token from Tauri persistent store.
 */
export async function deleteOfflineToken(): Promise<void> {
  if (!isTauri()) return;
  await tauriInvoke("delete_jwt");
}

/**
 * Hook that provides offline status and token management.
 */
export function useOfflineAuth() {
  const [offlineToken, setOfflineToken] = React.useState<string | null>(null);
  const [isOnline, setIsOnline] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (!isTauri()) return;

    // Check online status
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Load stored token on mount
    loadOfflineToken().then(setOfflineToken);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    offlineToken,
    isOnline,
    isDesktop: isTauri(),
    saveOfflineToken,
    deleteOfflineToken,
  };
}
