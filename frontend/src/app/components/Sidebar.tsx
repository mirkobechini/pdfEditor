"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api, PdfDocument } from "../lib/api";
import { mapError } from "../lib/error-map";
import { isTauri } from "../lib/tauri";

const PLATFORM_ICONS: Record<string, string> = {
  web: "🌐",
  desktop: "💻",
  mobile: "📱",
};

function getPlatformIcon(source?: string): string | null {
  if (!source) return null;
  const current = isTauri() ? "desktop" : "web";
  if (source === current) return null; // stessa piattaforma, nessuna icona
  return PLATFORM_ICONS[source] || null;
}

interface SidebarProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpload: (doc: PdfDocument) => void;
  onDeleteClick: (file: PdfDocument) => void;
  onBatchDelete?: (ids: string[]) => void;
  onBatchExport?: (ids: string[]) => void;
  refreshKey?: number;
}

export default function Sidebar({ selectedId, onSelect, onUpload, onDeleteClick, onBatchDelete, onBatchExport, refreshKey }: SidebarProps) {
  const t = useTranslations("sidebar");
  const [files, setFiles] = React.useState<PdfDocument[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [renameId, setRenameId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [multiSelect, setMultiSelect] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // Load files on mount and when refreshKey changes
  React.useEffect(() => {
    async function loadFiles() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listPdfs();
        setFiles(res.items);
      } catch {
        setError(t("loadFailed"));
        console.error("Failed to load files");
      } finally {
        setLoading(false);
      }
    }
    loadFiles();
  }, [refreshKey]);

  async function handleUpload(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert(t("uploadOnlyPdf"));
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const doc = await api.uploadPdfWithProgress(file, (progress) => {
        setUploadProgress(progress);
      });
      setFiles((prev) => [doc, ...prev]);
      onUpload(doc);
      onSelect(doc.id);
    } catch (err) {
      alert(t("uploadFailed") + ": " + mapError(err));
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  // Drag & drop
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  // Commit rename: save new filename via API and update local list
  async function commitRename(file: PdfDocument) {
    const newName = renameValue.trim();
    if (!newName || newName === file.original_filename) {
      setRenameId(null);
      return;
    }
    try {
      const updated = await api.updateMetadata(file.id, { new_filename: newName });
      setFiles((prev) => prev.map((f) => (f.id === file.id ? updated : f)));
    } catch (err) {
      console.error("Rename failed:", err);
    } finally {
      setRenameId(null);
    }
  }

  // ─── Multi-select batch ────────────────────────────────────────
  function toggleMultiSelect() {
    setMultiSelect((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(files.map((f) => f.id)));
    }
  }

  function exitMultiSelect() {
    setMultiSelect(false);
    setSelectedIds(new Set());
  }

  function handleBatchDelete() {
    if (selectedIds.size === 0 || !onBatchDelete) return;
    onBatchDelete(Array.from(selectedIds));
    exitMultiSelect();
  }

  function handleBatchExport() {
    if (selectedIds.size === 0 || !onBatchExport) return;
    onBatchExport(Array.from(selectedIds));
    exitMultiSelect();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Upload area */}
      <div
        className={`m-3 p-4 border-2 border-dashed rounded-lg text-center text-sm cursor-pointer transition-colors ${dragOver
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
          }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
        <div className="text-2xl mb-1">📄</div>
        <div className="text-gray-500 dark:text-gray-400">{t("dropHere")}</div>

        {/* Upload progress bar */}
        {uploading && uploadProgress !== null && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {uploadProgress}%
            </p>
          </div>
        )}
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {/* Multi-select toolbar */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={toggleMultiSelect}
            className={`text-xs px-2 py-1 rounded border ${multiSelect ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"}`}
            data-testid="multi-select-toggle"
          >
            {multiSelect ? t("done") : t("select")}
          </button>
          {multiSelect && (
            <>
              <button
                onClick={toggleSelectAll}
                className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                data-testid="multi-select-all"
              >
                {selectedIds.size === files.length ? t("deselectAll") : t("selectAll")}
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400" data-testid="multi-select-count">
                {selectedIds.size} {t("selected")}
              </span>
            </>
          )}
        </div>

        {multiSelect && selectedIds.size > 0 && (
          <div className="flex items-center gap-2 mb-2 p-2 rounded bg-blue-50 dark:bg-blue-900/20" data-testid="batch-actions">
            <button
              onClick={handleBatchDelete}
              className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white"
              data-testid="batch-delete"
            >
              🗑️ {t("deleteSelected")}
            </button>
            <button
              onClick={handleBatchExport}
              className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="batch-export"
            >
              ⬇ {t("exportSelected")}
            </button>
          </div>
        )}

        {loading && <div className="text-center text-sm text-gray-400">{t("loading")}</div>}
        {error && (
          <div className="mx-2 p-2 text-sm text-red-700 bg-red-100 dark:bg-red-900/30 rounded">
            {error}
          </div>
        )}
        {!loading && !error && files.length === 0 && (
          <div className="text-center text-sm text-gray-400 mt-8">{t("noPdfs")}</div>
        )}
        {files.map((file) => (
          <div
            key={file.id}
            className={`p-2 mb-1 rounded cursor-pointer flex items-center justify-between text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedId === file.id ? "bg-blue-100 dark:bg-blue-900/30" : ""} ${multiSelect && selectedIds.has(file.id) ? "bg-blue-100 dark:bg-blue-900/30" : ""}`}
            onClick={() => multiSelect ? toggleSelect(file.id) : onSelect(file.id)}
            data-testid={`file-item-${file.id}`}
          >
            {multiSelect && (
              <input
                type="checkbox"
                checked={selectedIds.has(file.id)}
                onChange={() => toggleSelect(file.id)}
                onClick={(e) => e.stopPropagation()}
                className="mr-1"
                data-testid={`file-checkbox-${file.id}`}
              />
            )}
            {renameId === file.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => void commitRename(file)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void commitRename(file);
                  } else if (e.key === "Escape") {
                    setRenameId(null);
                  }
                }}
                className="flex-1 bg-transparent border border-blue-500 rounded px-1 text-sm"
              />
            ) : (
              <span className="truncate flex-1">
                {getPlatformIcon(file.upload_source) && (
                  <span className="mr-1" title={file.upload_source}>{getPlatformIcon(file.upload_source)}</span>
                )}
                {file.original_filename}
              </span>
            )}
            <div className="flex gap-1 shrink-0 ml-1">
              <button
                className="text-xs text-gray-400 hover:text-blue-500"
                onClick={(e) => {
                  e.stopPropagation();
                  setRenameId(file.id);
                  setRenameValue(file.original_filename);
                }}
                title={t("rename")}
              >
                ✏️
              </button>
              <button
                className="text-xs text-gray-400 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteClick(file);
                }}
                title={t("delete")}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
