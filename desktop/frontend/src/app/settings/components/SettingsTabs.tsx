"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { isTauri, tauriInvoke } from "../../../shared/tauri";
import type { SettingsPageState } from "../../../hooks/useSettingsPage";

type AboutRow = {
    id: string;
    title: string;
    subtitle: string;
    type: "badge" | "action";
    value?: string;
};

function getRuntimeRows(tsu: (k: string) => string): readonly AboutRow[] {
    return [
        { id: "pdf_engine", title: tsu("pdfEngine"), subtitle: tsu("pdfEngineDesc"), type: "badge", value: tsu("pdfEngineValue") },
        { id: "shell", title: tsu("shell"), subtitle: tsu("shellDesc"), type: "badge", value: tsu("shellValue") },
        { id: "sidecar", title: tsu("sidecar"), subtitle: tsu("sidecarDesc"), type: "badge", value: tsu("sidecarValue") },
    ];
}

function getLicenseRows(tsu: (k: string) => string): readonly AboutRow[] {
    return [
        { id: "app_license", title: tsu("appLicense"), subtitle: tsu("appLicenseDesc"), type: "badge", value: tsu("appLicenseValue") },
        { id: "third_party", title: tsu("thirdParty"), subtitle: tsu("thirdPartyDesc"), type: "action", value: tsu("thirdPartyValue") },
    ];
}

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

/**
 * Renders the active settings tab content (issue #885, A3c - step 2).
 * Extracted from the renderTabContent() switch in settings/page.tsx so the
 * page stays thin. Pure presentational: reads state/handlers from `s`.
 */
export default function SettingsTabs({ s }: { s: SettingsPageState }) {
    const ts = s.ts;

    switch (s.activeTab) {
        case "general":
            return (
                <div className="max-w-[900px]">
                    <h1 className="text-[36px] font-bold leading-tight text-white">{ts("generalTitle")}</h1>
                    <p className="mt-1 text-[14px] text-[#9d9184]">{ts("generalDesc")}</p>
                    <div className="mt-8 rounded-2xl border border-white/10 bg-[#221b16] p-6">
                        <div className="flex items-center justify-between py-3 border-b border-white/10">
                            <div>
                                <p className="text-[16px] font-semibold text-white">{ts("language")}</p>
                                <p className="text-[14px] text-[#9d9184]">{s.prefs.language === "it" ? ts("languageItalian") : ts("languageEnglish")}</p>
                            </div>
                            <select
                                value={s.prefs.language}
                                onChange={(e) => { const newLang = e.target.value; s.updatePrefs({ language: newLang }); s.setLocale(newLang as "it" | "en"); }}
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
                                value={s.prefs.density}
                                onChange={(e) => s.updatePrefs({ density: e.target.value })}
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
                                onClick={() => s.updatePrefs({ antialiasing: !s.prefs.antialiasing })}
                                className={`h-6 w-11 rounded-full relative transition-colors cursor-pointer ${s.prefs.antialiasing ? "bg-[#f7871f]" : "bg-white/20"}`}
                            >
                                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${s.prefs.antialiasing ? "right-0.5" : "left-0.5"}`} />
                            </button>
                        </div>
                    </div>
                </div>
            );
        case "cloud":
            return (
                <div className="max-w-[900px]">
                    <h1 className="text-[36px] font-bold leading-tight text-white">{ts("cloud")}</h1>
                    <p className="mt-1 text-[14px] text-[#9d9184]">Sincronizza i tuoi PDF con il cloud</p>
                    <div className="mt-8 rounded-2xl border border-white/10 bg-[#221b16] p-6">
                        <div className="flex items-center justify-between py-3 border-b border-white/10">
                            <div>
                                <p className="text-[16px] font-semibold text-white">{ts("syncEnabled")}</p>
                                <p className="text-[14px] text-[#9d9184]">{ts("syncEnabledDesc")}</p>
                            </div>
                            <button
                                onClick={() => s.setSyncEnabled(!s.syncEnabled)}
                                className={`h-6 w-11 rounded-full relative transition-colors cursor-pointer ${s.syncEnabled ? "bg-[#f7871f]" : "bg-white/20"}`}
                            >
                                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${s.syncEnabled ? "right-0.5" : "left-0.5"}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-white/10">
                            <div>
                                <p className="text-[16px] font-semibold text-white">{ts("syncOnStartup")}</p>
                                <p className="text-[14px] text-[#9d9184]">{ts("syncOnStartupDesc")}</p>
                            </div>
                            <button
                                onClick={() => s.setSyncOnStartup(!s.syncOnStartup)}
                                className={`h-6 w-11 rounded-full relative transition-colors cursor-pointer ${s.syncOnStartup ? "bg-[#f7871f]" : "bg-white/20"}`}
                            >
                                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${s.syncOnStartup ? "right-0.5" : "left-0.5"}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between py-3">
                            <div>
                                <p className="text-[16px] font-semibold text-white">{ts("connectionStatus")}</p>
                                <p className="text-[14px] text-[#9d9184]">{s.isOnline ? ts("online") : ts("offline")}</p>
                            </div>
                            <span className={`rounded-xl px-3 py-1.5 text-[12px] font-semibold ${s.isOnline ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                {s.isOnline ? "● Online" : "● Offline"}
                            </span>
                        </div>
                        <div className="pt-3 border-t border-white/10">
                            <button
                                onClick={async () => {
                                    await s.syncAll();
                                }}
                                disabled={s.isSyncing || !s.syncEnabled || !s.isOnline}
                                className="cursor-pointer rounded-xl bg-[#f7871f] px-6 py-2 text-[14px] font-semibold text-white transition hover:bg-[#ff9b37] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {s.isSyncing ? ts("syncing") : ts("syncNow")}
                            {s.isSyncing && (
                                <span className="ml-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" style={{ verticalAlign: "middle" }} />
                            )}
                            </button>
                            {s.progress && (
                                <p className="mt-2 text-[12px] text-[#9d9184]">
                                    <span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#f7871f]/30 border-t-[#f7871f]" style={{ verticalAlign: "middle" }} />
                                    Sync in corso... ({s.progress.current}/{s.progress.total})
                                </p>
                            )}
                        </div>
                    </div>

                    {s.lastSyncResult && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={s.clearSyncResult}>
                            <div className="rounded-2xl border border-white/10 bg-[#221b16] p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                                <h2 className="text-[20px] font-bold text-white mb-4">Sync completato</h2>
                                <div className="space-y-2 text-[14px]">
                                    {s.lastSyncResult.uploaded > 0 && <p className="text-green-400">✅ {s.lastSyncResult.uploaded} PDF caricati sul cloud</p>}
                                    {s.lastSyncResult.downloaded > 0 && <p className="text-blue-400">⬇️ {s.lastSyncResult.downloaded} PDF scaricati dal cloud</p>}
                                    {s.lastSyncResult.skippedExisting > 0 && <p className="text-yellow-400">⏭️ {s.lastSyncResult.skippedExisting} PDF già presenti sul cloud (saltati)</p>}
                                    {s.lastSyncResult.skippedLocked > 0 && <p className="text-yellow-400">🔒 {s.lastSyncResult.skippedLocked} PDF saltati (protetti da password)</p>}
                                    {s.lastSyncResult.skipped > 0 && (
                                        <p className="text-yellow-400">⏭️ {s.lastSyncResult.skipped} PDF saltati (protetti da password)</p>
                                    )}
                                    {s.lastSyncResult.errors.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-red-400 font-semibold">⚠️ Errori ({s.lastSyncResult.errors.length}):</p>
                                            {s.lastSyncResult.errors.map((err, i) => (
                                                <p key={i} className="text-red-300 text-[12px] ml-2">{err}</p>
                                            ))}
                                        </div>
                                    )}
                                    {s.lastSyncResult.uploaded === 0 && s.lastSyncResult.downloaded === 0 && s.lastSyncResult.skipped === 0 && s.lastSyncResult.errors.length === 0 && (
                                        <p className="text-[#9d9184]">Nessun PDF da sincronizzare. Tutti già allineati.</p>
                                    )}
                                </div>
                                <button
                                    onClick={s.clearSyncResult}
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
                                value={s.prefs.default_zoom}
                                onChange={(e) => { const v = parseInt(e.target.value); s.updatePrefs({ default_zoom: v }); }}
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
                        {[ts("save"), ts("undo"), ts("redo"), ts("search"), ts("zoomIn"), ts("zoomOut")].map((action, i) => (
                            <div key={action} className={`flex items-center justify-between py-3 ${i < 5 ? "border-b border-white/10" : ""}`}>
                                <p className="text-[16px] font-semibold text-white">{action}</p>
                                <kbd className="rounded-lg border border-white/10 bg-[#2a231d] px-3 py-1 font-mono text-[12px] text-[#9d9184]">{[["Ctrl+S"], ["Ctrl+Z"], ["Ctrl+Shift+Z"], ["Ctrl+F"], ["Ctrl++"], ["Ctrl+-"]][i][0]}</kbd>
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
                                <p className="text-[16px] font-semibold text-white">{ts("workplace")}</p>
                                <p className="text-[14px] text-[#9d9184]">{s.prefs.default_save_folder || ts("workplaceNotSet")}</p>
                            </div>
                            <button
                                onClick={async () => {
                                    if (!isTauri()) return;
                                    try {
                                        const folder = await tauriInvoke<string>("dialog_open_folder", { defaultPath: s.prefs.default_save_folder || undefined });
                                        if (folder) {
                                            s.updatePrefs({ default_save_folder: folder });
                                        }
                                    } catch (err) {
                                        console.error("Failed to pick folder:", err);
                                    }
                                }}
                                className="cursor-pointer rounded-xl border border-white/10 bg-[#2a231d] px-3 py-1.5 text-[12px] font-semibold text-white"
                            >
                                {s.prefs.default_save_folder ? ts("workplaceChange") : ts("workplaceChoose")}
                            </button>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-white/10">
                            <div>
                                <p className="text-[16px] font-semibold text-white">{ts("systemLog")}</p>
                                <p className="text-[14px] text-[#9d9184]">{ts("systemLogDesc")}</p>
                            </div>
                            <button onClick={() => alert(ts("systemLogAlert"))} className="cursor-pointer rounded-xl border border-white/10 bg-[#2a231d] px-3 py-1.5 text-[12px] font-semibold text-white">{ts("open")}</button>
                        </div>
                        <div className="flex items-center justify-between py-3">
                            <div>
                                <p className="text-[16px] font-semibold text-white">{ts("clearCache")}</p>
                                <p className="text-[14px] text-[#9d9184]">{ts("clearCacheDesc")}</p>
                            </div>
                            <button onClick={() => { if (confirm(ts("clearCacheConfirm"))) { localStorage.clear(); alert(ts("cacheCleared")); } }} className="cursor-pointer rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[12px] font-semibold text-red-300">{ts("delete")}</button>
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
                            <p className="mt-1 text-[14px] text-[#9d9184]">{s.tc("version")} · {s.user?.license_tier || "Free"} License</p>
                        </div>
                    </section>

                    <AboutSection title={ts("pdfEngine")} rows={getRuntimeRows(ts)} />
                    <AboutSection title={ts("appLicense")} rows={getLicenseRows(ts)} onAction={(id) => {
                        if (id === "third_party") s.openUrl("https://github.com/mirkobechini/pdfEditor/blob/main/desktop/src-tauri/licenses.json");
                    }} />

                    <section className="mt-7 flex items-center gap-3 flex-wrap">
                        <button onClick={s.openChangelog} className="cursor-pointer rounded-xl border border-white/10 bg-[#2a231d] px-4 py-2 text-[13px] font-semibold text-white">{ts("releaseNotes")}</button>
                        <button onClick={() => s.setBugReportOpen(true)} className="cursor-pointer rounded-xl border border-white/10 bg-[#2a231d] px-4 py-2 text-[13px] font-semibold text-white">{ts("reportBug")}</button>
                        <button onClick={() => s.setDocsOpen(true)} className="cursor-pointer rounded-xl border border-white/10 bg-[#2a231d] px-4 py-2 text-[13px] font-semibold text-white">{ts("documentation")}</button>
                    </section>
                </div>
            );
        default:
            return null;
    }
}