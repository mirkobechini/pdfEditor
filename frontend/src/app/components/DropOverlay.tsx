"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface DropOverlayProps {
    visible: boolean;
}

export default function DropOverlay({ visible }: DropOverlayProps) {
    const t = useTranslations("app");

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 pointer-events-none">
            <div className="px-8 py-6 rounded-2xl bg-white dark:bg-gray-800 border-2 border-dashed border-orange-500 shadow-xl">
                <div className="text-4xl mb-2">📥</div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t("dropHere")}
                </p>
            </div>
        </div>
    );
}