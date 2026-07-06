"use client";

import React from "react";
import Image from "next/image";
import { api, PdfDocument } from "../lib/api";
import { renderFirstPageToDataUrl } from "../lib/pdfPreview";

interface PdfThumbnailProps {
  file: PdfDocument;
  fallbackIcon?: React.ReactNode;
  className?: string;
}

/**
 * Renders a PDF thumbnail preview with graceful fallback on error.
 * Handles race conditions (e.g., PDF deleted while loading).
 */
export default function PdfThumbnail({
  file,
  fallbackIcon,
  className = "w-full h-48 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center",
}: PdfThumbnailProps) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    loadPreview();
  }, [file.id]);

  async function loadPreview() {
    setLoading(true);
    setError(false);
    try {
      const blob = await api.downloadPdf(file.id);
      const url = URL.createObjectURL(blob);
      const dataUrl = await renderFirstPageToDataUrl(url);
      setPreviewUrl(dataUrl);
      URL.revokeObjectURL(url);
    } catch (err) {
      // Gracefully handle error (PDF deleted, race condition, etc.)
      console.debug(`Failed to load preview for PDF ${file.id}:`, err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  // Fallback: placeholder on error
  if (error) {
    return (
      <div className={className}>
        <div className="text-center">
          {fallbackIcon || (
            <svg className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500">Preview unavailable</p>
        </div>
      </div>
    );
  }

  // Loading: skeleton
  if (loading) {
    return (
      <div className={className}>
        <div className="animate-pulse w-full h-full bg-gray-300 dark:bg-gray-600 rounded" />
      </div>
    );
  }

  // Success: show image
  if (previewUrl) {
    return (
      <Image
        src={previewUrl}
        alt={`Preview of ${file.original_filename}`}
        width={300}
        height={400}
        unoptimized
        className="w-full h-auto rounded object-contain"
      />
    );
  }

  return null;
}
