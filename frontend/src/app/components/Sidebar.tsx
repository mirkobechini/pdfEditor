"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api, PdfDocument } from "../lib/api";

interface SidebarProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpload: (doc: PdfDocument) => void;
  onDeleteClick: (file: PdfDocument) => void;
  refreshKey?: number;
}

export default function Sidebar({ selectedId, onSelect, onUpload, onDeleteClick, refreshKey }: SidebarProps) {
  const t = useTranslations("sidebar");
  const [files, setFiles] = React.useState<PdfDocument[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [renameId, setRenameId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");

  // Load files on mount and when refreshKey changes
  React.useEffect(() => {
    loadFiles();
  }, [refreshKey]);

  async function loadFiles() {
    setLoading(true);
    try {
      const res = await api.listPdfs();
      setFiles(res.items);
    } catch {
      console.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert(t("uploadOnlyPdf"));
      return;
    }
    try {
      const doc = await api.uploadPdf(file);
      setFiles((prev) => [doc, ...prev]);
      onUpload(doc);
      onSelect(doc.id);
    } catch (err) {
      alert(t("uploadFailed") + ": " + err);
    }
  }

  // Drag & drop
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
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
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {loading && <div className="text-center text-sm text-gray-400">{t("loading")}</div>}
        {!loading && files.length === 0 && (
          <div className="text-center text-sm text-gray-400 mt-8">{t("noPdfs")}</div>
        )}
        {files.map((file) => (
          <div
            key={file.id}
            className={`p-2 mb-1 rounded cursor-pointer flex items-center justify-between text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedId === file.id ? "bg-blue-100 dark:bg-blue-900/30" : ""
              }`}
            onClick={() => onSelect(file.id)}
          >
            {renameId === file.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => setRenameId(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setRenameId(null);
                }}
                className="flex-1 bg-transparent border border-blue-500 rounded px-1 text-sm"
              />
            ) : (
              <span className="truncate flex-1">{file.original_filename}</span>
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
