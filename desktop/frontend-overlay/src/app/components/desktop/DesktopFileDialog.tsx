"use client";

import React from "react";
import { isTauri, tauriInvoke } from "../../lib/tauri";

interface DesktopFileDialogProps {
    /** Called when a file is selected (desktop: via Tauri dialog, web: via <input>) */
    onFileSelected: (file: File) => void;
    /** Accept attribute for the hidden input (web fallback) */
    accept?: string;
    /** Optional render prop for custom trigger UI */
    children?: (open: () => void) => React.ReactNode;
}

/**
 * File dialog that uses Tauri native dialog in desktop mode,
 * with a fallback to <input type="file"> in web mode.
 *
 * Usage:
 *   <DesktopFileDialog onFileSelected={handleUpload}>
 *     {(open) => <button onClick={open}>Upload PDF</button>}
 *   </DesktopFileDialog>
 */
export default function DesktopFileDialog({
    onFileSelected,
    accept = ".pdf",
    children,
}: DesktopFileDialogProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);

    const open = React.useCallback(async () => {
        if (isTauri()) {
            // Desktop: try Tauri native dialog
            try {
                const result = await tauriInvoke<{ path: string } | null>(
                    "plugin:dialog|open",
                    {
                        filters: [{ name: "PDF", extensions: ["pdf"] }],
                        multiple: false,
                    },
                );
                if (result?.path) {
                    // Read file via the sidecar API or Tauri fs plugin
                    // For now, fetch the file via the backend endpoint
                    const response = await fetch(
                        `http://127.0.0.1:7723/pdfs/upload-from-path?path=${encodeURIComponent(result.path)}`,
                        { method: "POST" },
                    );
                    if (response.ok) {
                        const doc = await response.json();
                        // Create a minimal File-like object from the response
                        const blob = new Blob([JSON.stringify(doc)], { type: "application/json" });
                        const file = new File([blob], doc.original_filename || "document.pdf", {
                            type: "application/pdf",
                        });
                        onFileSelected(file);
                    }
                }
            } catch {
                // Fallback to <input> on error
                inputRef.current?.click();
            }
        } else {
            // Web: use standard <input type=file>
            inputRef.current?.click();
        }
    }, [onFileSelected]);

    return (
        <>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onFileSelected(file);
                    // Reset so the same file can be selected again
                    e.target.value = "";
                }}
            />
            {children ? children(open) : null}
        </>
    );
}