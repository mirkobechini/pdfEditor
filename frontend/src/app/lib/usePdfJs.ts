"use client";

import { useState, useEffect } from "react";

const PDFJS_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const WORKER_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

/**
 * Hook to load PDF.js dynamically and track its loading state.
 * Returns `true` once PDF.js is fully loaded and ready to use.
 */
export function usePdfJs(): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ((window as any).pdfjsLib) {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
      setLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = PDFJS_URL;
    script.async = true;
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
      setLoaded(true);
    };
    document.body.appendChild(script);

    // Don't remove script on unmount — other components may use it
  }, []);

  return loaded;
}
