/**
 * Connectivity hook: tracks navigator online/offline state, including live
 * window events. Extracted from useCloudSync to keep it under 400 lines
 * (file lunghi, refactor/long-files-t6-desktophooks).
 */
import { useEffect, useState } from "react";

export function useOnlineStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(true);

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

  return { isOnline };
}