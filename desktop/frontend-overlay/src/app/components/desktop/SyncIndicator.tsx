"use client";

import React from "react";
import { useTranslations } from "next-intl";

type SyncState = "synced" | "syncing" | "error" | "offline";

interface SyncIndicatorProps {
    state: SyncState;
    lastSyncedAt?: string | null;
    onSyncNow?: () => void;
}

const stateConfig: Record<SyncState, { icon: string; bg: string; text: string }> = {
    synced: {
        icon: "✓",
        bg: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        text: "synced",
    },
    syncing: {
        icon: "⟳",
        bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        text: "syncing",
    },
    error: {
        icon: "✗",
        bg: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        text: "syncError",
    },
    offline: {
        icon: "⚡",
        bg: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        text: "offline",
    },
};

export default function SyncIndicator({
    state,
    lastSyncedAt,
    onSyncNow,
}: SyncIndicatorProps) {
    const t = useTranslations("common");
    const config = stateConfig[state];

    return (
        <div className="flex items-center gap-2">
            <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg}`}
                title={lastSyncedAt ? `${t("lastSync")}: ${lastSyncedAt}` : t(config.text)}
            >
                <span className="animate-pulse">{config.icon}</span>
                {t(config.text)}
            </span>
            {onSyncNow && (
                <button
                    onClick={onSyncNow}
                    disabled={state === "syncing"}
                    className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t("syncNow")}
                >
                    {t("syncNow")}
                </button>
            )}
        </div>
    );
}