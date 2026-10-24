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
import type { MindConfig, MindConfigUpdate, MindProviderEntry } from "../shared/api";

// Fix 16/10: al primo ingresso nessun provider preselezionato — il select mostra
// il placeholder "Seleziona provider" finché l'utente non sceglie. Il provider
// reale arriva dal backend dopo il load (e resta "" se non ancora configurato).
const DEFAULT_MIND_CONFIG: MindConfig = {
    provider: "",
    model: "",
    workspace: "",
    rag_enabled: true,
    streaming: true,
    has_api_key: false,
    api_key_masked: "",
    providers: [],
    fallback_enabled: true,
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
    // Fix 24/10 (piano doc keyring): un SOLO canale per la key del provider attivo.
    // State (non ref!) così la UI reagisce subito alla digitazione: la select
    // modello si abilita appena la key è presente (anche non ancora salvata) e
    // al salvataggio la key non viene più azzerata da un doppio canale.
    const [mindApiKeyDraft, setMindApiKeyDraft] = React.useState("");
    const [mindConfigError, setMindConfigError] = React.useState("");
    // Fix 16/10 (esito build 942c33a0): conferma visiva di avvenuto salvataggio.
    const [mindSaved, setMindSaved] = React.useState(false);
    // Punto 8: elenco modelli Ollama scaricati sulla macchina.
    const [ollamaModels, setOllamaModels] = React.useState<string[]>([]);
    // Modelli reali del provider cloud (solo se c'è la chiave). NIENTE catalogo
    // hardcoded: senza chiave la lista è vuota (punto 15/10, Mirko: "3 modelli che
    // non capisco se li hai scelti casualmente").
    const [modelCatalog, setModelCatalog] = React.useState<string[]>([]);
    // Punto 10: prova connessione al provider.
    const [mindTesting, setMindTesting] = React.useState(false);
    const [mindTestResult, setMindTestResult] = React.useState("");
    const [mindTestOk, setMindTestOk] = React.useState(false);
    // Punto 7: key per ogni provider della lista (editing locale, salvate al Salva).
    const [providerKeys, setProviderKeys] = React.useState<Record<number, string>>({});
    // Redesign 24/10 (issue #1035): flag espliciti di CANCELLAZIONE chiave.
    // Il backend cancella la chiave solo se riceve `api_key: ""` — i campi
    // lasciati vuoti NON vengono inviati (così la key esistente resta).
    // True = al prossimo Salva la chiave del provider attivo verrà cancellata.
    const [mindActiveKeyRemove, setMindActiveKeyRemove] = React.useState(false);
    // True per l'indice i = al prossimo Salva la chiave della riga i verrà cancellata.
    const [providerKeyDeletions, setProviderKeyDeletions] = React.useState<Record<number, boolean>>({});
    // Redesign 24/10: prova connessione PER RIGA (POST /mind/test con provider+modello
    // di QUELLA riga), con feedback per riga (ok/errore + messaggio).
    const [mindRowTesting, setMindRowTesting] = React.useState<Record<number, boolean>>({});
    const [mindRowTestResult, setMindRowTestResult] = React.useState<Record<number, { ok: boolean; message: string }>>({});

    // Helper (15/10): modelli disponibili per un provider generico. Ollama =
    // quelli scaricati; cloud = SOLO i reali caricati con la chiave (mai inventati).
    function getModelChoicesForProvider(provider: string): string[] {
        if (provider === "ollama") return ollamaModels;
        return modelCatalog;
    }

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

    // Fix 16/10: stringa vuota rimane vuota (nessun provider selezionato);
    // un valore invalido non-vuoto torna a "ollama" come fallback sicuro.
    const VALID_PROVIDERS = ["ollama", "anthropic", "openai", "openrouter", "huggingface"];
    function normalizeProvider(p: string): string {
        if (p === "") return "";
        return VALID_PROVIDERS.includes(p) ? p : "ollama";
    }

    function setMindConfigField<K extends keyof MindConfig>(key: K, value: MindConfig[K]) {
        setMindConfig((prev) => ({ ...prev, [key]: key === "provider" ? normalizeProvider(String(value)) : value }));
    }

    function setMindConfigApiKey(value: string) {
        setMindApiKeyDraft(value);
        // Redesign 24/10: digitare una nuova chiave annulla l'eventuale richiesta
        // di cancellazione (la nuova key prevale su tutto).
        if (value !== "") setMindActiveKeyRemove(false);
        // Un solo canale: la key digitata per il provider attivo finisce anche nel
        // draft della riga corrispondente in `providers` (se esiste), così il
        // salvataggio non la perde e non azzera le altre (fix 24/10).
        const activeProv = mindConfig.provider;
        if (activeProv) {
            const idx = (mindConfig.providers || []).findIndex((p) => p.provider === activeProv);
            if (idx >= 0) setProviderKeys((prev) => ({ ...prev, [idx]: value }));
        }
    }

    async function saveMindConfig() {
        setMindConfigError("");
        setMindSaved(false);
        const key = mindApiKeyDraft;
        // Redesign 24/10: se il flag di cancellazione è attivo, la key del provider
        // attivo va CANCELLATA (api_key: "" nel payload — il backend la elimina
        // dal keystore). Vale solo se NON è stata digitata una nuova key.
        const removeActiveKey = mindActiveKeyRemove && !key;
        // Fix 16/10 (esito build 942c33a0): il provider attivo scelto dal select deve
        // finire (di testa, massima precedenza) nella lista `providers` con il suo
        // modello, così la selezione resta coerente con la configurazione salvata.
        const activeProv = mindConfig.provider?.trim();
        let providers: MindProviderEntry[] = (mindConfig.providers || []).map((p, i) => {
            const entry: MindProviderEntry = {
                provider: p.provider,
                model: p.model,
                enabled: p.enabled,
            };
            // Fix 24/10 (doppio canale key): la key del provider attivo viene dal
            // canale principale; per le altre righe dal draft di riga. Il campo
            // `api_key` viene inviato SOLO se l'utente ha digitato qualcosa non
            // vuoto — MAI "" per non cancellare una chiave già salvata per sbaglio.
            // Eccezione esplicita: se per questa riga è stato chiesto di RIMUOVERE
            // la chiave (pulsantino “rimuovi chiave”), si invia api_key: "" — il
            // backend supporta la cancellazione con stringa vuota.
            const isActive = activeProv && p.provider === activeProv;
            const rowKey = isActive ? key : providerKeys[i];
            if (rowKey !== undefined && rowKey !== "") {
                entry.api_key = rowKey;
            } else if (isActive ? removeActiveKey : providerKeyDeletions[i]) {
                entry.api_key = "";
            }
            return entry;
        });
        if (activeProv && !providers.some((p) => p.provider === activeProv)) {
            providers = [
                {
                    provider: activeProv,
                    model: mindConfig.model || "",
                    enabled: true,
                    ...(key && key.trim() ? { api_key: key } : {}),
                },
                ...providers,
            ];
        }
        const patch: MindConfigUpdate = {
            provider: mindConfig.provider,
            model: mindConfig.model,
            workspace: mindConfig.workspace,
            rag_enabled: mindConfig.rag_enabled,
            streaming: mindConfig.streaming,
            providers,
            fallback_enabled: mindConfig.fallback_enabled,
        };
        if (key && key.trim()) patch.api_key = key;
        // Cancellazione esplicita della key del provider attivo (24/10): si invia
        // la stringa vuota, il backend elimina la chiave dal keystore.
        else if (removeActiveKey) patch.api_key = "";
        try {
            const updated = await api.updateMindConfig(patch);
            setMindConfig(updated);
            setMindApiKeyDraft("");
            setProviderKeys({});
            setMindActiveKeyRemove(false);
            setProviderKeyDeletions({});
            setMindSaved(true);
            window.setTimeout(() => setMindSaved(false), 2500);
            if (updated.provider === "ollama" || (updated.providers && updated.providers.some((p) => p.provider === "ollama"))) {
                loadOllamaModels();
            }
        } catch (err) {
            console.error("Failed to save Deep Agent config:", err);
            setMindConfigError(apiError(err));
            setMindSaved(false);
        }
    }

    // Punto 7: lista provider — aggiungi/rimuovi/riordina/attiva + key per voce.
    // (Il bottone "+ Aggiungi" non è più usato dalla UI dal redesign 24/10: il
    // blocco principale aggiunge. La funzione resta per compatibilità.)
    function addMindProvider() {
        setMindConfig((prev) => ({
            ...prev,
            providers: [...(prev.providers || []), { provider: "ollama", model: "", enabled: true, has_api_key: false, api_key_masked: "" }],
        }));
    }

    function updateMindProvider(idx: number, patch: Partial<{ provider: string; model: string; enabled: boolean }>) {
        setMindConfig((prev) => {
            const list = [...(prev.providers || [])];
            if (idx < 0 || idx >= list.length) return prev;
            list[idx] = { ...list[idx], ...patch };
            return { ...prev, providers: list };
        });
    }

    function removeMindProvider(idx: number) {
        setMindConfig((prev) => {
            const list = [...(prev.providers || [])];
            if (idx < 0 || idx >= list.length) return prev;
            return { ...prev, providers: list.filter((_, i) => i !== idx) };
        });
        // Pull-list senza indici orfani nei draft (chiavi/delezioni/test).
        setProviderKeys((prev) => {
            const n: Record<number, string> = {};
            Object.entries(prev).forEach(([k, v]) => { const i = Number(k); if (i < idx) n[i] = v; else if (i > idx) n[i - 1] = v; });
            return n;
        });
        setProviderKeyDeletions((prev) => {
            const n: Record<number, boolean> = {};
            Object.entries(prev).forEach(([k, v]) => { const i = Number(k); if (i < idx) n[i] = v; else if (i > idx) n[i - 1] = v; });
            return n;
        });
        setMindRowTesting((prev) => {
            const n: Record<number, boolean> = {};
            Object.entries(prev).forEach(([k, v]) => { const i = Number(k); if (i < idx) n[i] = v; else if (i > idx) n[i - 1] = v; });
            return n;
        });
        setMindRowTestResult((prev) => {
            const n: Record<number, { ok: boolean; message: string }> = {};
            Object.entries(prev).forEach(([k, v]) => { const i = Number(k); if (i < idx) n[i] = v; else if (i > idx) n[i - 1] = v; });
            return n;
        });
    }

    function moveMindProvider(idx: number, dir: -1 | 1) {
        setMindConfig((prev) => {
            const list = [...(prev.providers || [])];
            const to = idx + dir;
            if (idx < 0 || to < 0 || to >= list.length) return prev;
            [list[idx], list[to]] = [list[to], list[idx]];
            return { ...prev, providers: list };
        });
        // Gli indici dei draft locali (chiavi, delezioni, esiti test) seguono lo
        // spostamento: il valore che era su idx va su to e viceversa.
        const to = idx + dir;
        const swap = <T,>(setter: React.Dispatch<React.SetStateAction<Record<number, T>>>) => {
            setter((prev) => {
                const hasA = idx in prev;
                const hasB = to in prev;
                if (!hasA && !hasB) return prev;
                const n = { ...prev };
                const a = prev[idx];
                const b = prev[to];
                if (hasA) n[to] = a; else delete n[to];
                if (hasB) n[idx] = b; else delete n[idx];
                return n;
            });
        };
        swap(setProviderKeys);
        swap(setProviderKeyDeletions);
        swap(setMindRowTesting);
        swap(setMindRowTestResult);
    }

    // Redesign 24/10: draft della chiave di una riga. Digitare una nuova key
    // annulla l'eventuale richiesta di cancellazione per quella riga.
    function setProviderDraftKey(idx: number, value: string) {
        setProviderKeys((prev) => ({ ...prev, [idx]: value }));
        if (value !== "") {
            setProviderKeyDeletions((prev) => {
                if (!prev[idx]) return prev;
                const n = { ...prev };
                delete n[idx];
                return n;
            });
        }
    }

    // Redesign 24/10: chiedi di CANCELLARE la chiave di una riga al prossimo
    // salvataggio (api_key: "" nel payload). `remove` false = annulla.
    function setProviderKeyDeletion(idx: number, remove: boolean) {
        if (remove) {
            // svuota il draft digitato: la cancellazione prevale sulla key scritta
            setProviderKeys((prev) => (idx in prev ? { ...prev, [idx]: "" } : prev));
            setProviderKeyDeletions((prev) => ({ ...prev, [idx]: true }));
        } else {
            setProviderKeyDeletions((prev) => {
                if (!prev[idx]) return prev;
                const n = { ...prev };
                delete n[idx];
                return n;
            });
        }
    }

    function setMindProviderFallback(val: boolean) {
        setMindConfig((prev) => ({ ...prev, fallback_enabled: val }));
    }

    // Punto 8 (15/10): appena il provider cambia, carica subito i modelli
    // disponibili (Ollama = quelli scaricati; cloud = SOLO con chiave) così il
    // campo modello è una SELECT, non un input libero. Se non c'è chiave per un
    // cloud, la lista resta vuota (con hint in UI).
    // Fix 24/10: dipende ANCHE dalla key appena digitata (draft) — appena scrivi
    // la chiave (anche non salvata) i modelli si caricano e la select si abilita.
    // Debounce 400ms: non sparare una GET al provider a ogni keystroke.
    React.useEffect(() => {
        if (!mindLoaded) return;
        const prov = mindConfig.provider;
        if (prov === "ollama") {
            setModelCatalog([]);
            loadOllamaModels();
        } else {
            setOllamaModels([]);
            const draft = mindApiKeyDraft.trim();
            const t = window.setTimeout(
                () => loadProviderModels(prov, draft ? draft : undefined),
                400,
            );
            return () => window.clearTimeout(t);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mindConfig.provider, mindLoaded, mindApiKeyDraft]);

    // Punto 8 (15/10): elenco modelli Ollama locali (da /mind/ollama/models).
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

    // Punto (15/10): modelli REALI del provider cloud via /mind/models. Usa la
    // chiave appena digitata (se presente) oppure quella salvata; se non c'è
    // chiave la lista resta vuota (niente catalogo inventato).
    async function loadProviderModels(provider: string, apiKey?: string) {
        try {
            const params = new URLSearchParams({ provider });
            if (apiKey && apiKey.trim()) params.set("api_key", apiKey.trim());
            const res = await fetch(`${getApiBaseUrl()}/mind/models?${params.toString()}`);
            if (!res.ok) { setModelCatalog([]); return; }
            const data = await res.json();
            const models = Array.isArray(data.models) ? data.models.filter((m: unknown) => typeof m === "string") : [];
            setModelCatalog(models);
        } catch {
            setModelCatalog([]);
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

    // Redesign 24/10 (issue #1035): prova connessione PER RIGA della lista
    // `providers` — usa provider+modello di QUELLA riga (POST /mind/test),
    // non quelli della selezione attiva. Feedback per riga (ok/errore + messaggio).
    async function testMindProviderConnection(idx: number) {
        const row = (mindConfig.providers || [])[idx];
        if (!row) return;
        setMindRowTesting((prev) => ({ ...prev, [idx]: true }));
        setMindRowTestResult((prev) => {
            if (!(idx in prev)) return prev;
            const n = { ...prev };
            delete n[idx];
            return n;
        });
        setMindConfigError("");
        try {
            const res = await fetch(`${getApiBaseUrl()}/mind/test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider: row.provider, model: row.model || undefined }),
            });
            const data = await res.json();
            setMindRowTestResult((prev) => ({
                ...prev,
                [idx]: res.ok && data.ok
                    ? { ok: true, message: data.message || ts("deepAgentTestOk") }
                    : { ok: false, message: data.message || data.detail || ts("deepAgentTestFail") },
            }));
        } catch {
            setMindRowTestResult((prev) => ({ ...prev, [idx]: { ok: false, message: ts("deepAgentTestFail") } }));
        } finally {
            setMindRowTesting((prev) => ({ ...prev, [idx]: false }));
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
        mindConfig, setMindConfigField, setMindConfigApiKey, mindApiKeyDraft, saveMindConfig, mindConfigError, mindSaved,
        ollamaModels, modelCatalog, getModelChoicesForProvider, testMindConnection, mindTesting, mindTestResult, mindTestOk,
        addMindProvider, updateMindProvider, removeMindProvider, moveMindProvider,
        setMindProviderFallback, providerKeys, setProviderKeys,
        // redesign 24/10: cancellazione chiave esplicita + test connessione per riga
        mindActiveKeyRemove, setMindActiveKeyRemove,
        providerKeyDeletions, setProviderDraftKey, setProviderKeyDeletion,
        testMindProviderConnection, mindRowTesting, mindRowTestResult,
        // docs
        docsOpen, setDocsOpen,
    };
}

/** Shape returned by useSettingsPage, used by extracted presentational renders. */
export type SettingsPageState = ReturnType<typeof useSettingsPage>;