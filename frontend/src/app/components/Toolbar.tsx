"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface ToolbarProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onMerge: () => void;
  onSplit: () => void;
  onReorder: () => void;
  onRemovePages: () => void;
  onReplaceText: () => void;
  onMetadata: () => void;
  onProtect: () => void;
  onCompress: () => void;
  onImportExport: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onSign: () => void;
  onShare: () => void;
  onAnnotate: () => void;
  onOcr: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

type OpenMenu = "organize" | "convert" | "annotate" | null;

const MENU_BTN =
  "px-3 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed";
const MENU_ITEM =
  "flex w-full items-center px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30";

export default function Toolbar({
  currentPage,
  totalPages,
  onPageChange,
  zoom,
  onZoomChange,
  onMerge,
  onSplit,
  onReorder,
  onRemovePages,
  onReplaceText,
  onMetadata,
  onProtect,
  onCompress,
  onImportExport,
  onPrint,
  onDownload,
  onSign,
  onShare,
  onAnnotate,
  onOcr,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: ToolbarProps) {
  const t = useTranslations("app");
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  // Wrapper dei soli menu a tendina: il click fuori chiude, dentro no.
  const menusRef = React.useRef<HTMLDivElement | null>(null);

  // Keyboard shortcuts: Ctrl+Z for undo, Ctrl+Shift+Z for redo
  // Use refs to avoid re-registering the listener on every render
  const onUndoRef = React.useRef(onUndo);
  const onRedoRef = React.useRef(onRedo);
  useEffect(() => { onUndoRef.current = onUndo; });
  useEffect(() => { onRedoRef.current = onRedo; });

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        onRedoRef.current();
      } else if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        onUndoRef.current();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Chiude il menu se si clicca fuori dai menu a tendina.
  useEffect(() => {
    if (!openMenu) return;
    function closeOnOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (menusRef.current && !menusRef.current.contains(target)) setOpenMenu(null);
    }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, [openMenu]);

  function toggleMenu(menu: Exclude<OpenMenu, null>) {
    setOpenMenu(openMenu === menu ? null : menu);
  }

  function run(fn: () => void) {
    setOpenMenu(null);
    fn();
  }

  // Gruppo "Organizza": merge, split, reorder, remove
  const organizeItems = [
    { key: "merge", onClick: onMerge },
    { key: "split", onClick: onSplit },
    { key: "reorder", onClick: onReorder },
    { key: "remove", onClick: onRemovePages },
  ];
  // Gruppo "Converti": compress, importExport, replaceText, metadata
  const convertItems = [
    { key: "compress", onClick: onCompress },
    { key: "importExport", onClick: onImportExport },
    { key: "replaceText", onClick: onReplaceText },
    { key: "metadata", onClick: onMetadata },
  ];
  // Gruppo "Annota": sign, share, annotate, ocr
  const annotateItems = [
    { key: "sign", onClick: onSign },
    { key: "share", onClick: onShare },
    { key: "annotate", onClick: onAnnotate },
    { key: "ocr", onClick: onOcr },
  ];

  return (
    <>
      {/* Undo / Redo */}
      <div className="flex items-center gap-1">
        <button
          className="px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↩
        </button>
        <button
          className="px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          ↪
        </button>
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      {/* Page navigation */}
      <div className="flex items-center gap-2">
        <button
          className="px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || totalPages === 0}
        >
          ◀
        </button>
        <span className="text-sm whitespace-nowrap">
          <input
            type="number"
            value={currentPage}
            min={1}
            max={totalPages}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (v >= 1 && v <= totalPages) onPageChange(v);
            }}
            className="w-10 text-center bg-transparent border border-gray-300 dark:border-gray-600 rounded text-sm"
          />
          <span className="mx-1">/</span>
          <span>{totalPages}</span>
        </span>
        <button
          className="px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || totalPages === 0}
        >
          ▶
        </button>
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      {/* Zoom */}
      <div className="flex items-center gap-2">
        <button
          className="px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={() => onZoomChange(Math.max(0.25, zoom - 0.25))}
        >
          ➖
        </button>
        <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button
          className="px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={() => onZoomChange(Math.min(4, zoom + 0.25))}
        >
          ➕
        </button>
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      {/* Menu a tendina: avvolti per gestire la chiusura al click fuori */}
      <div className="flex items-center gap-1" ref={menusRef}>
      {/* ─── Organizza dropdown ─── */}
      <div className="relative">
        <button
          onClick={() => toggleMenu("organize")}
          data-testid="toolbar-organize"
          className={MENU_BTN}
        >
          {t("organize")} ▾
        </button>
        {openMenu === "organize" && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-1 shadow-xl">
            {organizeItems.map((item) => (
              <button key={item.key} onClick={() => run(item.onClick)} className={MENU_ITEM}>
                {t(item.key)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Converti dropdown ─── */}
      <div className="relative">
        <button
          onClick={() => toggleMenu("convert")}
          data-testid="toolbar-convert"
          className={MENU_BTN}
        >
          {t("convert")} ▾
        </button>
        {openMenu === "convert" && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-1 shadow-xl">
            {convertItems.map((item) => (
              <button key={item.key} onClick={() => run(item.onClick)} className={MENU_ITEM}>
                {t(item.key)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Annota dropdown ─── */}
      <div className="relative">
        <button
          onClick={() => toggleMenu("annotate")}
          data-testid="toolbar-annotate-menu"
          className={MENU_BTN}
        >
          {t("annotate")} ▾
        </button>
        {openMenu === "annotate" && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-1 shadow-xl">
            {annotateItems.map((item) => (
              <button key={item.key} onClick={() => run(item.onClick)} className={MENU_ITEM}>
                {t(item.key)}
              </button>
            ))}
          </div>
        )}
      </div>

      </div>

      {/* Azioni dirette: download, protect e print restano sempre visibili */}
      <button
        className={`px-3 py-1 text-xs rounded ${MENU_BTN}`}
        data-testid="toolbar-download"
        onClick={onDownload}
        disabled={!canUndo}
      >
        {t("download")}
      </button>
      <button className={`px-3 py-1 text-xs rounded ${MENU_BTN}`} onClick={onProtect}>
        {t("protect")}
      </button>
      <button className={`px-3 py-1 text-xs rounded ${MENU_BTN}`} data-testid="toolbar-print" onClick={onPrint}>
        {t("print")}
      </button>
    </>
  );
}