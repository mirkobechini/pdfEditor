"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { api } from "../../shared/api";
import { useAuth } from "../../shared/auth";
import { useLocaleSetter } from "../../lib/i18n";
import { usePreferences } from "../../lib/preferences";
import { isTauri, tauriInvoke } from "../../shared/tauri";
import { useCloudSync } from "../../hooks/useCloudSync";

const sections = [
    { id: "general", label: "general" },
    { id: "appearance", label: "appearance" },
    { id: "editor", label: "editor" },
    { id: "cloud", label: "cloud" },
    { id: "shortcuts", label: "shortcuts" },
    { id: "advanced", label: "advanced" },
    { id: "about", label: "about" },
] as const;

type SectionId = (typeof sections)[number]["id"];

type AboutRow = {
    id: string;
    title: string;
    subtitle: string;
    type: "badge" | "action";
    value?: string;
};

const runtimeRows: readonly AboutRow[] = [
    {
        id: "pdf_engine",
        title: "Motore PDF",
        subtitle: "Rendering ed editing locale",
        type: "badge",
        value: "PyMuPDF 1.24.9",
    },
    {
        id: "shell",
        title: "Shell desktop",
        subtitle: "Bundle nativo firmato e notarizzato",
        type: "badge",
        value: "Tauri 2.1",
    },
    {
        id: "sidecar",
        title: "Sidecar",
        subtitle: "Processo API locale",
        type: "badge",
        value: "FastAPI • Python 3.12",
    },
];

const licenseRows: readonly AboutRow[] = [
    {
        id: "app_license",
        title: "Licenza applicazione",
        subtitle: "Codice sorgente disponibile su richiesta",
        type: "badge",
        value: "AGPL-3.0",
    },
    {
        id: "third_party",
        title: "Licenze di terze parti",
        subtitle: "Elenco completo delle dipendenze",
        type: "action",
        value: "Visualizza",
    },
];

function AboutSection({ title, rows, onAction }: { title: string; rows: readonly AboutRow[]; onAction?: (id: string) => void }) {
    return (
        <section className="mt-6">
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#9d9184]">{title}</p>

            <div className="mt-3 rounded-2xl border border-white/10 bg-[#221b16] px-4 py-1">
                {rows.map((row, idx) => (
                    <div
                        key={row.id}
                        className={`flex items-center justify-between gap-4 py-4 ${idx !== rows.length - 1 ? "border-b border-white/10" : ""}`}
                    >
                        <div>
                            <h3 className="text-[16px] font-semibold text-white">{row.title}</h3>
                            <p className="mt-1 text-[14px] text-[#9d9184]">{row.subtitle}</p>
                        </div>

                        {row.type === "action" ? (
                            <button
                                onClick={() => onAction?.(row.id)}
                                className="cursor-pointer rounded-xl border border-white/10 bg-[#2a231d] px-3 py-1.5 text-[12px] font-semibold text-white"
                            >
                                {row.value}
                            </button>
                        ) : (
                            <span className="rounded-xl border border-white/10 bg-[#2a231d] px-3 py-1.5 text-[12px] font-semibold text-white">{row.value}</span>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}

export default function SettingsPage() {
    const ts = useTranslations("settings");
    const { user } = useAuth();
    const setLocale = useLocaleSetter();
    const { prefs, updatePrefs } = usePreferences();
    const { syncEnabled, setSyncEnabled, syncOnStartup, setSyncOnStartup, isOnline, isSyncing, progress, syncAll, lastSyncResult, clearSyncResult } = useCloudSync();
    const [activeTab, setActiveTab] = React.useState<SectionId>("general");
    const [appVersion, setAppVersion] = React.useState("");
    const [changelogOpen, setChangelogOpen] = React.useState(false);
    const [bugReportOpen, setBugReportOpen] = React.useState(false);
    const [docsOpen, setDocsOpen] = React.useState(false);
    const [changelogData, setChangelogData] = React.useState<{ version: string; date: string; changes: string[] }[] | null>(null);
    const [bugTitle, setBugTitle] = React.useState("");
    const [bugDesc, setBugDesc] = React.useState("");
    const [bugSending, setBugSending] = React.useState(false);
    const [bugError, setBugError] = React.useState("");
    const [bugDone, setBugDone] = React.useState(false);

    // Read version from common i18n
    React.useEffect(() => {
        const tc = (window as any).__NEXT_INTL_MESSAGES?.common?.version;
        if (tc) setAppVersion(tc);
    }, []);

    function openUrl(url: string) {
        if (isTauri()) {
            tauriInvoke("plugin:opener|open_url", { url });
        } else {
            window.open(url, "_blank");
        }
    }

    function renderTabContent() {
        switch (activeTab) {
            case "general":
                return (
                    <div className="max-w-[900px]">
                        <h1 className="text-[36px] font-bold leading-tight text-white">{ts("generalTitle")}</h1>
                        <p className="mt-1 text-[14px] text-[#9d9184]">{ts("generalDesc")}</p>
                        <div className="mt-8 rounded-2xl border border-white/10 bg-[#221b16] p-6">
                            <div className="flex items-center justify-between py-3 border-b border-white/10">
                                <div>
                                    <p className="text-[16px] font-semibold text-white">{ts("language")}</p>
                                    <p className="text-[14px] text-[#9d9184]">{prefs.language === "it" ? "Italiano" : "English"}</p>
                                </div>
                                <select
                                    value={prefs.language}
                                    onChange={(e) => { const newLang = e.target.value; updatePrefs({ language: newLang }); setLocale(newLang as "it" | "en"); }}
                                    className="cursor-pointer rounded-xl border border-white/10 bg-[#2a231d] px-3 py-1.5 text-[12px] text-white outline-none"
                                >
                                    <option value="it">Italiano</option>
                                    <option value="en">English</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <div>
                                    <p className="text-[16px] font-semibold text-white">{ts("autoStart")}</p>
                                    <p className="text-[14px] text-[#9d9184]">{ts("autoStartDesc")}</p>
                                </div>
                                <div className="h-6 w-11 rounded-full bg-[#f7871f] relative">
                                    <div className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow" />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case "appearance":
                return (
                    <div className="max-w-[900px]">
                        <h1 className="text-[36px] font-bold leading-tight text-white">{ts("appearanceTitle")}</h1>
                        <p className="mt-1 text-[14px] text-[#9d9184]">{ts("appearanceDesc")}</p>
                        <div className="mt-8 rounded-2xl border border-white/10 bg-[#221b16] p-6">
                            <div className="flex items-center justify-between py-3 border-b border-white/10">
                                <div>
                                    <p className="text-[16px] font-semibold text-white">{ts("density")}</p>
                                    <p className="text-[14px] text-[#9d9184]">{ts("densityDesc")}</p>
                                </div>
                                <select
                                    value={prefs.density}
                                    onChange={(e) => updatePrefs({ density: e.target.value })}
                                    className="cursor-pointer rounded-xl border border-white/10 bg-[#2a231d] px-3 py-1.5 text-[12px] text-white outline-none"
                                >
                                    <option value="compact">Compatto</option>
                                    <option value="comfortable">Comodo</option>
                                    <option value="spacious">Ampio</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <div>
                                    <p className="text-[16px] font-semibold text-white">{ts("antialiasing")}</p>
                                    <p className="text-[14px] text-[#9d9184]">{ts("antialiasingDesc")}</p>
                                </div>
                                <button
                                    onClick={() => updatePrefs({ antialiasing: !prefs.antialiasing })}
                                    className={`h-6 w-11 rounded-full relative transition-colors cursor-pointer ${prefs.antialiasing ? "bg-[#f7871f]" : "bg-white/20"}`}
                                >
                                    <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${prefs.antialiasing ? "right-0.5" : "left-0.5"}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case "cloud":
                return (
                    <div className="max-w-[900px]">
                        <h1 className="text-[36px] font-bold leading-tight text-white">Cloud Sync</h1>
                        <p className="mt-1 text-[14px] text-[#9d9184]">Sincronizza i tuoi PDF con il cloud</p>
                        <div className="mt-8 rounded-2xl border border-white/10 bg-[#221b16] p-6">
                            <div className="flex items-center justify-between py-3 border-b border-white/10">
                                <div>
                                    <p className="text-[16px] font-semibold text-white">Sync abilitato</p>
                                    <p className="text-[14px] text-[#9d9184]">Carica e scarica PDF dal cloud</p>
                                </div>
                                <button
                                    onClick={() => setSyncEnabled(!syncEnabled)}
                                    className={`h-6 w-11 rounded-full relative transition-colors cursor-pointer ${syncEnabled ? "bg-[#f7871f]" : "bg-white/20"}`}
                                >
                                    <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${syncEnabled ? "right-0.5" : "left-0.5"}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-white/10">
                                <div>
                                    <p className="text-[16px] font-semibold text-white">Sync all&apos;avvio</p>
                                    <p className="text-[14px] text-[#9d9184]">Sincronizza automaticamente all&apos;apertura</p>
                                </div>
                                <button
                                    onClick={() => setSyncOnStartup(!syncOnStartup)}
                                    className={`h-6 w-11 rounded-full relative transition-colors cursor-pointer ${syncOnStartup ? "bg-[#f7871f]" : "bg-white/20"}`}
                                >
                                    <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${syncOnStartup ? "right-0.5" : "left-0.5"}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <div>
                                    <p className="text-[16px] font-semibold text-white">Stato connessione</p>
                                    <p className="text-[14px] text-[#9d9184]">{isOnline ? "Online" : "Offline"}</p>
                                </div>
                                <span className={`rounded-xl px-3 py-1.5 text-[12px] font-semibold ${isOnline ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                    {isOnline ? "● Online" : "● Offline"}
                                </span>
                            </div>
                            <div className="pt-3 border-t border-white/10">
                                <button
                                    onClick={async () => {
                                        const result = await syncAll();
                                        if (result.uploaded > 0 || result.downloaded > 0 || result.errors.length > 0) {
                                            // Result is stored in lastSyncResult, shown as dialog
                                        }
                                    }}
                                    disabled={isSyncing || !syncEnabled || !isOnline}
                                    className="cursor-pointer rounded-xl bg-[#f7871f] px-6 py-2 text-[14px] font-semibold text-white transition hover:bg-[#ff9b37] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSyncing ? "Sync in corso..." : "Sincronizza ora"}
                                </button>
                                {progress && (
                                    <p className="mt-2 text-[12px] text-[#9d9184]">
                                        Sync in corso... ({progress.current}/{progress.total})
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Sync result dialog */}
                        {lastSyncResult && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={clearSyncResult}>
                                <div className="rounded-2xl border border-white/10 bg-[#221b16] p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                                    <h2 className="text-[20px] font-bold text-white mb-4">Sync completato</h2>
                                    <div className="space-y-2 text-[14px]">
                                        <p className="text-green-400">✅ {lastSyncResult.uploaded} PDF caricati sul cloud</p>
                                        <p className="text-blue-400">⬇️ {lastSyncResult.downloaded} PDF scaricati dal cloud</p>
                                        {lastSyncResult.errors.length > 0 && (
                                            <div className="mt-3">
                                                <p className="text-red-400 font-semibold">⚠️ Errori ({lastSyncResult.errors.length}):</p>
                                                {lastSyncResult.errors.map((err, i) => (
                                                    <p key={i} className="text-red-300 text-[12px] ml-2">{err}</p>
                                                ))}
                                            </div>
                                        )}
                                        {lastSyncResult.uploaded === 0 && lastSyncResult.downloaded === 0 && lastSyncResult.errors.length === 0 && (
                                            <p className="text-[#9d9184]">Nessun PDF da sincronizzare. Tutti già allineati.</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={clearSyncResult}
                                        className="mt-4 w-full cursor-pointer rounded-xl bg-[#f7871f] px-6 py-2 text-[14px] font-semibold text-white"
                                    >
                                        OK
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case "editor":
                return (
                    <div className="max-w-[900px]">
                        <h1 className="text-[36px] font-bold leading-tight text-white">{ts("editorTitle")}</h1>
                        <p className="mt-1 text-[14px] text-[#9d9184]">{ts("editorDesc")}</p>
                        <div className="mt-8 rounded-2xl border border-white/10 bg-[#221b16] p-6">
                            <div className="flex items-center justify-between py-3 border-b border-white/10">
                                <div>
                                    <p className="text-[16px] font-semibold text-white">{ts("defaultZoom")}</p>
                                    <p className="text-[14px] text-[#9d9184]">{ts("defaultZoomDesc")}</p>
                                </div>
                                <select
                                    value={prefs.default_zoom}
                                    onChange={(e) => { const v = parseInt(e.target.value); updatePrefs({ default_zoom: v }); }}
                                    className="cursor-pointer rounded-xl border border-white/10 bg-[#2a231d] px-3 py-1.5 text-[12px] text-white outline-none"
                                >
                                    {[75, 100, 125, 150, 200].map((z) => (
                                        <option key={z} value={z}>{z}%</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case "shortcuts":
                return (
                    <div className="max-w-[900px]">
                        <h1 className="text-[36px] font-bold leading-tight text-white">{ts("shortcutsTitle")}</h1>
                        <p className="mt-1 text-[14px] text-[#9d9184]">{ts("shortcutsDesc")}</p>
                        <div className="mt-8 rounded-2xl border border-white/10 bg-[#221b16] p-6">
                            {[
                                [ts("save"), "Ctrl+S"],
                                [ts("undo"), "Ctrl+Z"],
                                [ts("redo"), "Ctrl+Shift+Z"],
                                [ts("search"), "Ctrl+F"],
                                [ts("zoomIn"), "Ctrl++"],
                                [ts("zoomOut"), "Ctrl+-"],
                            ].map(([action, key], i) => (
                                <div key={action as string} className={`flex items-center justify-between py-3 ${i < 5 ? "border-b border-white/10" : ""}`}>
                                    <p className="text-[16px] font-semibold text-white">{action as string}</p>
                                    <kbd className="rounded-lg border border-white/10 bg-[#2a231d] px-3 py-1 font-mono text-[12px] text-[#9d9184]">{key}</kbd>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case "advanced":
                return (
                    <div className="max-w-[900px]">
                        <h1 className="text-[36px] font-bold leading-tight text-white">{ts("advancedTitle")}</h1>
                        <p className="mt-1 text-[14px] text-[#9d9184]">{ts("advancedDesc")}</p>
                        <div className="mt-8 rounded-2xl border border-white/10 bg-[#221b16] p-6">
                            <div className="flex items-center justify-between py-3 border-b border-white/10">
                                <div>
                                    <p className="text-[16px] font-semibold text-white">{ts("systemLog")}</p>
                                    <p className="text-[14px] text-[#9d9184]">{ts("systemLogDesc")}</p>
                                </div>
                                <button onClick={() => alert("Log di sistema:\n\nIl sidecar scrive i log nella console del terminale.\nPer vederli, avvia l'app da terminale con: desktop\pdf-editor-desktop.exe")} className="cursor-pointer rounded-xl border border-white/10 bg-[#2a231d] px-3 py-1.5 text-[12px] font-semibold text-white">{ts("open")}</button>
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <div>
                                    <p className="text-[16px] font-semibold text-white">{ts("clearCache")}</p>
                                    <p className="text-[14px] text-[#9d9184]">{ts("clearCacheDesc")}</p>
                                </div>
                                <button onClick={() => { if (confirm("Cancellare la cache locale?")) { localStorage.clear(); alert("Cache cancellata."); } }} className="cursor-pointer rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[12px] font-semibold text-red-300">{ts("delete")}</button>
                            </div>
                        </div>
                    </div>
                );
            case "about":
                return (
                    <div className="max-w-[900px]">
                        <h1 className="text-[36px] font-bold leading-tight text-white">{ts("aboutTitle")}</h1>
                        <p className="mt-1 text-[14px] text-[#9d9184]">{ts("aboutDesc")}</p>

                        <section className="mt-6 flex items-center gap-4">
                            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f7871f] shadow-[0_8px_20px_rgba(247,135,31,0.35)]">
                                <div className="relative h-8 w-6 rounded-[8px] bg-[#fff8f2]">
                                    <span className="absolute -bottom-1 -right-1 inline-flex h-3.5 w-3.5 rounded-full border-2 border-[#f7871f] bg-white" />
                                </div>
                            </div>

                            <div>
                                <h2 className="text-[42px] font-bold leading-tight text-white">PdfEditor</h2>
                                <p className="mt-1 text-[14px] text-[#9d9184]">{appVersion || "v0.1.33"} · {user?.license_tier || "Free"} License</p>
                            </div>
                        </section>

                        <AboutSection title={ts("pdfEngine")} rows={runtimeRows} />
                        <AboutSection title={ts("appLicense")} rows={licenseRows} onAction={(id) => {
                            if (id === "third_party") openUrl("https://github.com/mirkobechini/pdfEditor/blob/main/desktop/src-tauri/licenses.json");
                        }} />

                        <section className="mt-7 flex items-center gap-3 flex-wrap">
                            <button onClick={() => { setChangelogOpen(true); fetch("https://raw.githubusercontent.com/mirkobechini/pdfEditor/dev/changelog.json").then(r => r.json()).then(d => setChangelogData(d?.desktop || [])).catch(() => setChangelogData([])); }} className="cursor-pointer rounded-xl border border-white/10 bg-[#2a231d] px-4 py-2 text-[13px] font-semibold text-white">{ts("releaseNotes")}</button>
                            <button onClick={() => setBugReportOpen(true)} className="cursor-pointer rounded-xl border border-white/10 bg-[#2a231d] px-4 py-2 text-[13px] font-semibold text-white">{ts("reportBug")}</button>
                            <button onClick={() => setDocsOpen(true)} className="cursor-pointer rounded-xl border border-white/10 bg-[#2a231d] px-4 py-2 text-[13px] font-semibold text-white">{ts("documentation")}</button>
                        </section>
                    </div>
                );
        }
    }

    return (
        <div className="min-h-screen bg-[#17120f] p-[3px] text-[#f4f1ee]">
            <div className="mx-auto flex min-h-[calc(100vh-6px)] w-full max-w-[1330px] overflow-hidden rounded-[22px] border border-white/10 bg-[#201a15]">
                <aside className="w-[250px] shrink-0 border-r border-white/10 bg-[#1f1914] px-5 py-6">
                    <Link href="/app" className="flex items-center gap-2 rounded-[14px] border border-white/10 bg-[#2a231d] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#2f2822] transition cursor-pointer mb-6">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                        Torna all'editor
                    </Link>
                    <div className="space-y-1">
                        {sections.map((item) => {
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full rounded-[14px] px-4 py-2.5 text-left text-[13px] transition cursor-pointer ${activeTab === item.id
                                        ? "border border-white/10 bg-[#241d17] font-semibold text-white"
                                        : "border border-transparent text-[#9d9184] hover:text-white"
                                        }`}
                                >
                                    {ts(item.label)}
                                </button>
                            );
                        })}
                    </div>
                </aside>

                <main className="flex-1 bg-[#221b16] px-9 py-8 overflow-y-auto">
                    {renderTabContent()}
                </main>
            </div>

            {/* Changelog modal */}
            {changelogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-2xl max-h-[80vh] rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-white">{ts("releaseNotes")}</h2>
                            <button onClick={() => setChangelogOpen(false)} className="h-8 w-8 rounded-lg text-[#9a8d80] hover:bg-white/10 transition-colors">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4">
                            {changelogData === null ? (
                                <p className="text-sm text-[#9a8d80]">Caricamento in corso...</p>
                            ) : changelogData.length === 0 ? (
                                <p className="text-sm text-[#9a8d80]">Changelog non disponibile.</p>
                            ) : (
                                changelogData.map((entry) => (
                                    <div key={entry.version} className="rounded-xl border border-white/10 bg-[#1f1914] p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#3e2717] text-[#f7871f] font-medium">{entry.version}</span>
                                            <span className="text-xs text-[#7e7267]">{entry.date}</span>
                                        </div>
                                        <ul className="space-y-1">
                                            {entry.changes.map((change, i) => (
                                                <li key={i} className="text-sm text-[#c4b8ab]">{change}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))
                            )}
                        </div>
                        <button onClick={() => setChangelogOpen(false)} className="mt-4 self-end rounded-xl bg-[#f7871f] px-5 py-2 text-sm font-semibold text-white">Chiudi</button>
                    </div>
                </div>
            )}

            {/* Bug report modal */}
            {bugReportOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-white">{bugDone ? "Grazie!" : ts("reportBug")}</h2>
                            <button onClick={() => { setBugReportOpen(false); setBugError(""); setBugDone(false); }} className="h-8 w-8 rounded-lg text-[#9a8d80] hover:bg-white/10 transition-colors">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>
                        {bugDone ? (
                            <div>
                                <p className="text-sm text-[#48c769] mb-6">Segnalazione inviata con successo. Grazie per il contributo!</p>
                                <button onClick={() => { setBugReportOpen(false); setBugDone(false); }} className="w-full rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white">Chiudi</button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <input value={bugTitle} onChange={(e) => setBugTitle(e.target.value)} placeholder="Titolo del bug" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none focus:border-[#f7871f]/50" />
                                <textarea value={bugDesc} onChange={(e) => setBugDesc(e.target.value)} placeholder="Descrizione del problema..." rows={5} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none focus:border-[#f7871f]/50 resize-none" />
                                {bugError && <p className="text-xs text-red-400">{bugError}</p>}
                                <div className="flex gap-3">
                                    <button onClick={() => { setBugReportOpen(false); setBugError(""); }} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[#9a8d80] hover:bg-white/5">Annulla</button>
                                    <button onClick={async () => {
                                        if (!bugTitle.trim() || !bugDesc.trim()) { setBugError("Compila tutti i campi."); return; }
                                        setBugSending(true); setBugError("");
                                        try {
                                            await api.createBugReport(bugTitle.trim(), bugDesc.trim(), "desktop-settings");
                                            setBugDone(true);
                                            setBugTitle(""); setBugDesc("");
                                        } catch (err) {
                                            setBugError(err instanceof Error ? err.message : "Invio fallito");
                                        } finally { setBugSending(false); }
                                    }} disabled={bugSending} className="flex-1 rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                                        {bugSending ? "Invio..." : "Invia"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Documentation modal */}
            {docsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-white">{ts("documentation")}</h2>
                            <button onClick={() => setDocsOpen(false)} className="h-8 w-8 rounded-lg text-[#9a8d80] hover:bg-white/10 transition-colors">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="space-y-4 text-sm text-[#c4b8ab]">
                            <p>La documentazione completa di PdfEditor è disponibile su GitHub.</p>
                            <div className="flex gap-3">
                                <button onClick={() => openUrl("https://github.com/mirkobechini/pdfEditor")} className="flex-1 rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white">Apri su GitHub</button>
                                <button onClick={() => setDocsOpen(false)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[#9a8d80] hover:bg-white/5">Chiudi</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
