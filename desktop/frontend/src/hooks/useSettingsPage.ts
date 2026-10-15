"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api } from "../shared/api";
import { useAuth } from "../shared/auth";
import { useLocaleSetter } from "../lib/i18n";
import { usePreferences } from "../lib/preferences";
import { isTauri, tauriInvoke, getApiBaseUrl } from "../shared/tauri";
import { useCloudSync } from "./useCloudSync";
import { useApiError } from "./useApiError";
import type { MindConfig } from "../shared/api";

const DEFAULT_MIND_CONFIG: MindConfig = {
    provider: "ollama",
    model: "",
    workspace: "workspace",
    rag_enabled: true,
    streaming: true,
    has_api_key: false,
};

const sections = [
    { id: "general", label: "general" },
    { id: "appearance", label: "appearance" },
    { id: "editor", label: "editor" },
    { id: "deep_agent", label: "deepAgent" },
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
    const { syncEnabled, setSyncEnabled, syncOnStartup, setSyncOnStartup, isOnline, isSyncing, progress, syncAll, lastSyncResult, clearSyncResult, pendingCloudDeletions, resolveCloudDeletion } = useCloudSync({ autoSyncOnMount: false });
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
    // Deep Agent config (#932 T3b)
    const [mindConfig, setMindConfig] = React.useState<MindConfig>(DEFAULT_MIND_CONFIG);
    const [mindLoaded, setMindLoaded] = React.useState(false);
    const [mindPendingApiKey] = React.useState<{ current?: string }>({});
    const [mindConfigError, setMindConfigError] = React.useState("");
    // Punto 8: elenco modelli Ollama scaricati sulla macchina.
    const [ollamaModels, setOllamaModels] = React.useState<string[]>([]);
    // Punto 10: prova connessione al provider.
    const [mindTesting, setMindTesting] = React.useState(false);
    const [mindTestResult, setMindTestResult] = React.useState("");
    const [mindTestOk, setMindTestOk] = React.useState(false);

    // Carica la config Deep Agent dal backend alla prima apertura (lazy, una volta).
    React.useEffect(() => {
        if (mindLoaded) return;
        let cancelled = false;
        api.getMindConfig()
            .then((cfg) => { if (!cancelled) setMindConfig(cfg); })
            .catch(() => { /* backend non attivo: tieni i default */ })
            .finally(() => { if (!cancelled) setMindLoaded(true); });
        return () => { cancelled = true; };
    }, [mindLoaded]);

    function setMindConfigField<K extends keyof MindConfig>(key: K, value: MindConfig[K]) {
        setMindConfig((prev) => ({ ...prev, [key]: value }));
    }

    function setMindConfigApiKey(value: string) {
        setMindPendingApiKeyRef(value);
    }

    function setMindPendingApiKeyRef(value: string) {
        mindPendingApiKey.current = value;
    }

    async function saveMindConfig() {
        const key = (mindPendingApiKey as { current?: string }).current ?? undefined;
        const patch: Partial<MindConfig> & { api_key?: string } = {
            provider: mindConfig.provider,
            model: mindConfig.model,
            workspace: mindConfig.workspace,
            rag_enabled: mindConfig.rag_enabled,
            streaming: mindConfig.streaming,
        };
        if (key !== undefined) patch.api_key = key;
        try {
            const updated = await api.updateMindConfig(patch);
            setMindConfig(updated);
            mindPendingApiKey.current = undefined;
            if (updated.provider === "ollama") loadOllamaModels();
        } catch (err) {
            console.error("Failed to save Deep Agent config:", err);
            setMindConfigError(apiError(err));
        }
    }

    // Punto 8: elenco modelli Ollama locali (da /mind/ollama/models).
    async function loadOllamaModels() {
        try {
            const res = await fetch(`${getApiBaseUrl()}/mind/ollama/models`);
            if (!res.ok) { setOllamaModels([]); return; }
            const data = await res.json();
            const models = Array.isArray(data.models) ? data.models.filter((m: unknown) => typeof m === "string") : [];
            setOllamaModels(models);
        } catch {
            setOllamaModels([]);
        }
    }

    // Punto 10: prova connessione al provider configurato.
    async function testMindConnection() {
        setMindTesting(true);
        setMindTestResult("");
        setMindConfigError("");
        try {
            const res = await fetch(`${getApiBaseUrl()}/mind/test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider: mindConfig.provider, model: mindConfig.model || undefined }),
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                setMindTestOk(true);
                setMindTestResult(data.message || ts("deepAgentTestOk"));
            } else {
                setMindTestOk(false);
                setMindTestResult(data.message || data.detail || ts("deepAgentTestFail"));
            }
        } catch {
            setMindTestOk(false);
            setMindTestResult(ts("deepAgentTestFail"));
        } finally {
            setMindTesting(false);
        }
    }

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
        pendingCloudDeletions, resolveCloudDeletion,
        // tabs
        activeTab, setActiveTab,
        // changelog
        changelogOpen, setChangelogOpen, changelogData, setChangelogData, openChangelog,
        // bug report
        bugReportOpen, setBugReportOpen, bugTitle, setBugTitle, bugDesc, setBugDesc,
        bugSending, setBugSending, bugError, bugDone, openUrl, closeBugReport, submitBugReport,
        // deep agent
        mindConfig, setMindConfigField, setMindConfigApiKey, saveMindConfig, mindConfigError,
        ollamaModels, testMindConnection, mindTesting, mindTestResult, mindTestOk,
        // docs
        docsOpen, setDocsOpen,
    };
}

/** Shape returned by useSettingsPage, used by extracted presentational renders. */
export type SettingsPageState = ReturnType<typeof useSettingsPage>;