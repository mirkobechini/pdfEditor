"use client";

import React from "react";
import { useI18n } from "../lib/i18n";

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
}

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
}: ToolbarProps) {
  const { t } = useI18n();
  return (
    <>
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

      {/* Actions */}
      <button className="px-3 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50" onClick={onMerge}>
        {t("app.merge")}
      </button>
      <button className="px-3 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50" disabled>
        {t("app.split")}
      </button>
      <button className="px-3 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50" disabled>
        {t("app.reorder")}
      </button>
      <button className="px-3 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50" disabled>
        {t("app.remove")}
      </button>
    </>
  );
}