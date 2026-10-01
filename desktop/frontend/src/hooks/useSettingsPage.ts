"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api } from "../shared/api";
import { useAuth } from "../shared/auth";
import { useLocaleSetter } from "../lib/i18n";
import { usePreferences } from "../lib/preferences";
import { isTauri, tauriInvoke } from "../shared/tauri";
import { useCloudSync } from "./useCloudSync";
import { useApiError } from "./useApiError";

const sections = [
    { id: "general", label: "general" },
    { id: "appearance", label: "appearance" },
    { id: "editor", label: "editor" },
    { id: "cloud", label: "cloud" },
    { id: "shortcuts", label: "shortcuts" },
    { id: "advanced", label: "advanced" },
    { id: "about", label: "about" },
] as const;

export type SectionId = (typeof sections)[number]["id"];
export const SECTION_LIST = sections;

/**
 * Hook extracted from settings/page.tsx (issue #885, A3c - step 1).
 * Owns all SettingsPage state and action handlers so page.tsx stays a thin
 * renderer. Also exposes the context values (prefs, sync, auth, i18n) that
 * the presentational tab/modals need. Zero behavior changes.
 */
export function useSettingsPage() {
    const ts = useTranslations("settings");
    const tc = useTranslations("common");
    const { apiError } = useApiError();
    const { user } = useAuth();
    const setLocale = useLocaleSetter();
    const { prefs, updatePrefs } = usePreferences();
    const { syncEnabled, setSyncEnabled, syncOnStartup, setSyncOnStartup, isOnline, isSyncing, progress, syncAll, lastSyncResult, clearSyncResult } = useCloudSync();
    const [activeTab, setActiveTab] = React.useState<SectionId>("general");
    const [changelogOpen, setChangelogOpen] = React.useState(false);
    const [bugReportOpen, setBugReportOpen] = React.useState(false);
    const [docsOpen, setDocsOpen] = React.useState(false);
    const [changelogData, setChangelogData] = React.useState<{ version: string; date: string; changes: string[] }[] | null>(null);
    const [bugTitle, setBugTitle] = React.useState("");
    const [bugDesc, setBugDesc] = React.useState("");
    const [bugSending, setBugSending] = React.useState(false);
    const [bugError, setBugError] = React.useState("");
    const [bugDone, setBugDone] = React.useState(false);

    function openUrl(url: string) {
        if (isTauri()) {
            tauriInvoke("plugin:opener|open_url", { url });
        } else {
            window.open(url, "_blank");
        }
    }

    function openChangelog() {
        setChangelogOpen(true);
        fetch("https://raw.githubusercontent.com/mirkobechini/pdfEditor/dev/changelog.json")
            .then((r) => r.json())
            .then((d) => setChangelogData(d?.desktop || []))
            .catch(() => setChangelogData([]));
    }

    function closeBugReport() {
        setBugReportOpen(false);
        setBugError("");
        setBugDone(false);
    }

    async function submitBugReport() {
        if (!bugTitle.trim() || !bugDesc.trim()) { setBugError(ts("bugValidationError")); return; }
        setBugSending(true);
        setBugError("");
        try {
            await api.createBugReport(bugTitle.trim(), bugDesc.trim());
            setBugDone(true);
            setBugTitle("");
            setBugDesc("");
        } catch (err) {
            setBugError(apiError(err));
        } finally {
            setBugSending(false);
        }
    }

    return {
        // i18n
        ts,
        tc,
        // auth
        user,
        // prefs
        prefs,
        updatePrefs,
        setLocale,
        // cloud sync
        syncEnabled, setSyncEnabled, syncOnStartup, setSyncOnStartup,
        isOnline, isSyncing, progress, syncAll, lastSyncResult, clearSyncResult,
        // tabs
        activeTab, setActiveTab,
        // changelog
        changelogOpen, setChangelogOpen, changelogData, setChangelogData, openChangelog,
        // bug report
        bugReportOpen, setBugReportOpen, bugTitle, setBugTitle, bugDesc, setBugDesc,
        bugSending, setBugSending, bugError, bugDone, openUrl, closeBugReport, submitBugReport,
        // docs
        docsOpen, setDocsOpen,
    };
}

/** Shape returned by useSettingsPage, used by extracted presentational renders. */
export type SettingsPageState = ReturnType<typeof useSettingsPage>;