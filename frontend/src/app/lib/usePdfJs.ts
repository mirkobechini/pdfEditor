"use client";

import { useState, useEffect } from "react";
import { PDFJS_URL, PDFJS_WORKER_URL as WORKER_URL } from "./pdfjs-config";

/**
 * Hook to load PDF.js dynamically and track its loading state.
 * Returns `true` once PDF.js is fully loaded and ready to use.
 */
export function usePdfJs(): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
      setLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = PDFJS_URL;
    script.async = true;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
      setLoaded(true);
    };
    document.body.appendChild(script);

    // Don't remove script on unmount — other components may use it
  }, []);

  return loaded;
}
