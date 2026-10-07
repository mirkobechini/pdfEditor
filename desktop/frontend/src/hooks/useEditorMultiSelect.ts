"use client";

// Stato e operazioni multi-select dell'editor desktop (selezione multipla,
// batch delete/export), estratto da useEditorState per tenerlo sotto le 400
// righe (file lunghi, refactor/long-files-t6-desktophooks).

import React from "react";
import { api } from "../shared/api";
import { tauriInvoke } from "../shared/tauri";
import type { PdfDocument } from "../shared/types";

export interface UseEditorMultiSelectContext {
  docs: PdfDocument[];
  setDocs: React.Dispatch<React.SetStateAction<PdfDocument[]>>;
  selectedDoc: PdfDocument | null;
  setSelectedDoc: React.Dispatch<React.SetStateAction<PdfDocument | null>>;
  setPdfUrl: React.Dispatch<React.SetStateAction<string | null>>;
  defaultSaveFolder: string | null;
}

export interface EditorMultiSelect {
  multiSelect: boolean;
  selectedIds: Set<string>;
  toggleMultiSelect: () => void;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  handleBatchDelete: () => Promise<void>;
  handleBatchExport: () => Promise<void>;
}

export function useEditorMultiSelect(
  ctx: UseEditorMultiSelectContext,
): EditorMultiSelect {
  const { docs, setDocs, selectedDoc, setSelectedDoc, setPdfUrl, defaultSaveFolder } = ctx;

  const [multiSelect, setMultiSelect] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

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
    if (selectedIds.size === docs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(docs.map((d) => d.id)));
    }
  }

  function exitMultiSelect() {
    setMultiSelect(false);
    setSelectedIds(new Set());
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      try {
        await api.deletePdf(id);
      } catch (err) {
        console.error("Batch delete failed for", id, err);
      }
    }
    setDocs((prev) => prev.filter((d) => !selectedIds.has(d.id)));
    if (selectedDoc && selectedIds.has(selectedDoc.id)) {
      setSelectedDoc(null);
      setPdfUrl(null);
    }
    exitMultiSelect();
  }

  async function handleBatchExport() {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      const doc = docs.find((d) => d.id === id);
      if (!doc) continue;
      try {
        const blob = await api.downloadPdf(id);
        const arrayBuf = await blob.arrayBuffer();
        const data = Array.from(new Uint8Array(arrayBuf));
        await tauriInvoke<string>("dialog_save", {
          defaultName: doc.original_filename,
          data,
          defaultFolder: defaultSaveFolder || null,
        });
      } catch (err) {
        console.error("Batch export failed for", id, err);
      }
    }
    exitMultiSelect();
  }

  return {
    multiSelect,
    selectedIds,
    toggleMultiSelect,
    toggleSelect,
    toggleSelectAll,
    handleBatchDelete,
    handleBatchExport,
  };
}