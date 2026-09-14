/**
 * Hook for checking if a new app version is available on GitHub.
 * Compares the local app version with the latest mobile release tag.
 */
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const GITHUB_API = "https://api.github.com/repos/mirkobechini/pdfEditor/releases";
const NOTIFIED_KEY = "pdfeditor_update_notified_version";

/**
 * Compare two semver-ish version strings (e.g. "0.2.1" vs "0.2.2").
 * Returns true if a is newer than b.
 */
export function isNewerVersion(a: string, b: string): boolean {
  const parse = (v: string): number[] =>
    v
      .replace(/^v/, "")
      .split(".")
      .map((n) => parseInt(n, 10))
      .map((n) => (isNaN(n) ? 0 : n));

  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return true;
    if (na < nb) return false;
  }
  return false;
}

interface UseUpdateCheckReturn {
  /** Whether a newer version is available */
  updateAvailable: boolean;
  /** The latest available version tag (e.g. "v0.2.2-mobile") */
  latestVersion: string;
  /** Dismiss the update notification (persists so it doesn't repeat) */
  dismissUpdate: () => Promise<void>;
}

export function useUpdateCheck(): UseUpdateCheckReturn {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const current = Constants.expoConfig?.version || "0.0.0";
        const res = await fetch(GITHUB_API);
        if (!res.ok) return;
        const releases = await res.json();
        // Find the latest mobile release (tag contains "-mobile")
        const mobile = releases.find((r: any) =>
          r.tag_name && r.tag_name.includes("-mobile"),
        );
        if (!mobile || !mobile.tag_name) return;

        const latestTag = mobile.tag_name; // e.g. "v0.2.2-mobile"
        const latestVer = latestTag.replace("-mobile", ""); // "v0.2.2"

        if (!isNewerVersion(latestVer, current)) return;

        // Don't re-notify for the same version
        const notified = await AsyncStorage.getItem(NOTIFIED_KEY);
        if (notified === latestTag) return;

        if (!cancelled) {
          setUpdateAvailable(true);
          setLatestVersion(latestTag);
        }
      } catch {
        // Network error — ignore, check again next time
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismissUpdate = async () => {
    if (latestVersion) {
      await AsyncStorage.setItem(NOTIFIED_KEY, latestVersion);
    }
    setUpdateAvailable(false);
  };

  return { updateAvailable, latestVersion, dismissUpdate };
}