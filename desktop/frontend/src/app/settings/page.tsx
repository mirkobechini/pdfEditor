"use client";

import React from "react";

const sections = [
    { id: "general", label: "General" },
    { id: "appearance", label: "Appearance" },
    { id: "editor", label: "Editor" },
    { id: "cloud", label: "Cloud & Sync" },
    { id: "shortcuts", label: "Shortcuts" },
    { id: "advanced", label: "Advanced" },
    { id: "about", label: "About", active: true },
] as const;

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
    {
        id: "license_key",
        title: "Chiave licenza",
        subtitle: "Attivata su 2 dispositivi di 3",
        type: "badge",
        value: "PE-PRM-••••-7742",
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
                            <button className="rounded-xl border border-white/10 bg-[#2a231d] px-3 py-1.5 text-[12px] font-semibold text-white">
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
    return (
        <div className="min-h-screen bg-[#17120f] p-[3px] text-[#f4f1ee]">
            <div className="mx-auto flex min-h-[calc(100vh-6px)] w-full max-w-[1330px] overflow-hidden rounded-[22px] border border-white/10 bg-[#201a15]">
                <aside className="w-[250px] border-r border-white/10 bg-[#1f1914] px-5 py-6">
                    <div className="space-y-1">
                        {sections.map((item) => {
                            return (
                                <button
                                    key={item.id}
                                    className={`w-full rounded-[14px] px-4 py-2.5 text-left text-[13px] transition ${"active" in item && item.active
                                        ? "border border-white/10 bg-[#241d17] font-semibold text-white"
                                        : "border border-transparent text-[#9d9184] hover:text-white"
                                        }`}
                                >
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </aside>

                <main className="flex-1 bg-[#221b16] px-9 py-8">
                    <div className="max-w-[900px]">
                        <h1 className="text-[36px] font-bold leading-tight text-white">About</h1>
                        <p className="mt-1 text-[14px] text-[#9d9184]">Versione, componenti open source e informazioni di licenza.</p>

                        <section className="mt-6 flex items-center gap-4">
                            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f7871f] shadow-[0_8px_20px_rgba(247,135,31,0.35)]">
                                <div className="relative h-8 w-6 rounded-[8px] bg-[#fff8f2]">
                                    <span className="absolute -bottom-1 -right-1 inline-flex h-3.5 w-3.5 rounded-full border-2 border-[#f7871f] bg-white" />
                                </div>
                            </div>

                            <div>
                                <h2 className="text-[42px] font-bold leading-tight text-white">PdfEditor</h2>
                                <p className="mt-1 text-[14px] text-[#9d9184]">v1.4.2 (build 20260728·a3f19c2) · macOS arm64</p>
                            </div>
                        </section>

                        <AboutSection title="Runtime" rows={runtimeRows} />
                        <AboutSection title="Licenza" rows={licenseRows} />

                        <section className="mt-7 flex items-center gap-3">
                            <button className="rounded-xl border border-white/10 bg-[#2a231d] px-4 py-2 text-[13px] font-semibold text-white">Note di rilascio</button>
                            <button className="rounded-xl border border-white/10 bg-[#2a231d] px-4 py-2 text-[13px] font-semibold text-white">Segnala un bug</button>
                            <button className="rounded-xl border border-white/10 bg-[#2a231d] px-4 py-2 text-[13px] font-semibold text-white">Documentazione</button>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}
