"use client";

import React from "react";

const sections = [
    { id: "general", label: "General" },
    { id: "appearance", label: "Appearance" },
    { id: "editor", label: "Editor" },
    { id: "cloud", label: "Cloud & Sync" },
    { id: "shortcuts", label: "Shortcuts" },
    { id: "advanced", label: "Advanced", active: true },
    { id: "about", label: "About" },
] as const;

type AdvancedRow = {
    id: string;
    title: string;
    subtitle: string;
    type: "toggle" | "select" | "badge" | "action";
    enabled?: boolean;
    value?: string;
};

const sidecarRows: readonly AdvancedRow[] = [
    {
        id: "port",
        title: "Porta sidecar",
        subtitle: "Processo FastAPI locale su 127.0.0.1",
        type: "badge",
        value: "8756",
    },
    {
        id: "workers",
        title: "Worker paralleli",
        subtitle: "Job di conversione simultanei",
        type: "badge",
        value: "4",
    },
    {
        id: "ram",
        title: "Limite RAM per job",
        subtitle: "Il job viene interrotto oltre la soglia",
        type: "badge",
        value: "1.5 GB",
    },
    {
        id: "restart",
        title: "Riavvio automatico",
        subtitle: "Se il sidecar termina in modo anomalo",
        type: "toggle",
        enabled: true,
    },
];

const diagnosticRows: readonly AdvancedRow[] = [
    {
        id: "log_level",
        title: "Livello di log",
        subtitle: "Scritti in ~/Library/Logs/PdfEditor",
        type: "select",
        value: "INFO",
    },
    {
        id: "crash",
        title: "Invia crash report",
        subtitle: "Stack trace anonimizzati, nessun contenuto PDF",
        type: "toggle",
        enabled: true,
    },
    {
        id: "telemetry",
        title: "Telemetria d'uso",
        subtitle: "Conteggi anonimi delle funzioni usate",
        type: "toggle",
        enabled: false,
    },
    {
        id: "open_logs",
        title: "Apri cartella log",
        subtitle: "Utile per allegare file a un bug report",
        type: "action",
        value: "Mostra nel Finder",
    },
];

function AdvancedSection({ title, rows }: { title: string; rows: readonly AdvancedRow[] }) {
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

                        {row.type === "toggle" ? (
                            <button
                                className={`relative h-7 w-12 rounded-full border transition ${row.enabled
                                    ? "border-[#f7871f] bg-[#f7871f]"
                                    : "border-white/10 bg-white/10"
                                    }`}
                                aria-label={row.title}
                            >
                                <span
                                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${row.enabled ? "right-1" : "left-1"}`}
                                />
                            </button>
                        ) : row.type === "select" ? (
                            <button className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-[#2a231d] px-3 py-1.5 text-[12px] font-semibold text-white">
                                <span>{row.value}</span>
                                <span className="text-[10px] text-[#8f8377]">▼</span>
                            </button>
                        ) : row.type === "action" ? (
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
                        <h1 className="text-[36px] font-bold leading-tight text-white">Advanced</h1>
                        <p className="mt-1 text-[14px] text-[#9d9184]">Motore locale, limiti di risorse e strumenti di diagnostica.</p>

                        <AdvancedSection title="Sidecar engine" rows={sidecarRows} />
                        <AdvancedSection title="Diagnostica" rows={diagnosticRows} />

                        <section className="mt-7 rounded-2xl border border-[#b45147]/70 bg-[#3a2521] px-4 py-4">
                            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#ff7f73]">Danger zone</p>
                            <div className="mt-3 flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-[18px] font-semibold text-white">Reimposta tutte le preferenze</h3>
                                    <p className="mt-1 text-[13px] text-[#bfa39c]">
                                        Cancella il database SQLite locale delle impostazioni. I PDF non vengono toccati.
                                    </p>
                                </div>

                                <button className="rounded-xl bg-[#f26d63] px-4 py-2 text-[12px] font-bold text-white">
                                    Reset
                                </button>
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}
