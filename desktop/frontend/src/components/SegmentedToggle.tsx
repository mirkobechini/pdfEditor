"use client";

import React from "react";

/**
 * Shared segmented toggle button group used by the option pickers in
 * PrintOptionsModal (orientation, margin, color). Renders a row of mutually
 * exclusive buttons whose selected state is conveyed via `aria-pressed`, with
 * the same orange highlight styling used across the print dialog.
 */
export interface SegmentedOption<T extends string> {
    value: T;
    label: string;
}

interface SegmentedToggleProps<T extends string> {
    options: SegmentedOption<T>[];
    selected: T;
    onSelect: (value: T) => void;
    /** e.g. "print-orientation" → testids like "print-orientation-auto". */
    testidPrefix: string;
}

export default function SegmentedToggle<T extends string>({
    options,
    selected,
    onSelect,
    testidPrefix,
}: SegmentedToggleProps<T>) {
    const base =
        "flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-all duration-100 active:scale-95 ";
    const activeClass = "border-orange-600 bg-orange-600 text-white";
    const idleClass =
        "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700";

    return (
        <div className="flex gap-2">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => onSelect(opt.value)}
                    data-testid={`${testidPrefix}-${opt.value}`}
                    aria-pressed={selected === opt.value}
                    className={`${base}${selected === opt.value ? activeClass : idleClass}`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}