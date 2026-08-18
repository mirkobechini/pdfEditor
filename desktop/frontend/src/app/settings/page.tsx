"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { api } from "../../shared/api";
import { useAuth } from "../../shared/auth";
import { useLocaleSetter } from "../../lib/i18n";
import { usePreferences } from "../../lib/preferences";

const sections = [
    { id: "general", label: "general" },
    { id: "appearance", label: "appearance" },
    { id: "editor", label: "editor" },
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

function AboutSection({ title, rows }: { title: string; rows: readonly AboutRow[] }) {
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
                            <button className="cursor-pointer rounded-xl border border-white/10 bg-[#2a231d] px-3 py-1.5 text-[12px] font-semibold text-white">
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
    const [activeTab, setActiveTab] = React.useState<SectionId>("general");
    const [appVersion, setAppVersion] = React.useState("");

    // Read version from common i18n
    React.useEffect(() => {
        const tc = (window as any).__NEXT_INTL_MESSAGES?.common?.version;
        if (tc) setAppVersion(tc);
    }, []);

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
                        <AboutSection title={ts("appLicense")} rows={licenseRows} />

                        <section className="mt-7 flex items-center gap-3">
                            <button onClick={() => window.open("https://github.com/mirkobechini/pdfEditor/releases", "_blank")} className="cursor-pointer rounded-xl border border-white/10 bg-[#2a231d] px-4 py-2 text-[13px] font-semibold text-white">{ts("releaseNotes")}</button>
                            <button onClick={() => window.open("https://github.com/mirkobechini/pdfEditor/issues/new", "_blank")} className="cursor-pointer rounded-xl border border-white/10 bg-[#2a231d] px-4 py-2 text-[13px] font-semibold text-white">{ts("reportBug")}</button>
                            <button onClick={() => window.open("https://github.com/mirkobechini/pdfEditor", "_blank")} className="cursor-pointer rounded-xl border border-white/10 bg-[#2a231d] px-4 py-2 text-[13px] font-semibold text-white">{ts("documentation")}</button>
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
        </div>
    );
}
