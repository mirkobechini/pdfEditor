"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { isTauri } from "../../../lib/tauri";
import { useOfflineAuth } from "./useOfflineAuth";

/**
 * Desktop-only badge showing online/offline status.
 * Renders nothing in web mode.
 */
export default function DesktopStatusBadge() {
    const t = useTranslations("common");
    const { isOnline, isDesktop } = useOfflineAuth();

    if (!isDesktop) return null;

    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isOnline
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}
            title={isOnline ? t("online") : t("offline")}
        >
            <span
                className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-500" : "bg-yellow-500"
                    }`}
            />
            {isOnline ? t("online") : t("offline")}
        </span>
    );
}