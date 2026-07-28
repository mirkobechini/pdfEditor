"use client";

import React from "react";

const steps = [
    { id: "01", title: "Benvenuto", done: true, active: false },
    { id: "02", title: "Attiva licenza", done: true, active: false },
    { id: "03", title: "Cartella di lavoro", done: true, active: false },
    { id: "04", title: "Sync opzionale", done: false, active: true },
] as const;

const syncModes = [
    { id: "local", title: "Solo locale", subtitle: "nessun upload", active: false },
    { id: "sync", title: "Sync cifrato", subtitle: "R2 • AES-256", active: true },
] as const;

const passphrase = "••••••••••••••";
const recoveryCode = "R2-K3PT-9ZQA-M4XV-8LNP-BWCR";

export default function WizardPage() {
    return (
        <div className="min-h-screen bg-[#17120f] p-[3px] text-[#f4f1ee]">
            <div className="mx-auto flex min-h-[calc(100vh-6px)] w-full max-w-[1330px] overflow-hidden rounded-[22px] border border-white/10 bg-[#201a15]">
                <aside className="flex w-[312px] flex-col border-r border-white/10 bg-[#1f1914] p-7">
                    <div className="mb-10 inline-flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#f7871f] shadow-[0_8px_20px_rgba(247,135,31,0.35)]">
                        <div className="h-8 w-6 rounded-[8px] bg-[#fff8f2]" />
                    </div>

                    <div className="space-y-3">
                        {steps.map((step) => (
                            <div
                                key={step.id}
                                className={`flex items-center gap-3 rounded-2xl px-4 py-4 ${step.active ? "border border-white/12 bg-white/[0.02]" : "border border-transparent"
                                    }`}
                            >
                                {"done" in step && step.done ? (
                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#f7871f] text-[15px] font-bold leading-none text-white">
                                        ✓
                                    </span>
                                ) : (
                                    <span
                                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-bold ${step.active
                                            ? "border border-[#8a4f22] bg-[#3c2516] text-[#f7871f]"
                                            : "border border-white/10 bg-white/[0.04] text-[#8b7f73]"
                                            }`}
                                    >
                                        {step.id}
                                    </span>
                                )}
                                <span className={`text-[14px] leading-tight ${step.active ? "font-semibold text-white" : "text-[#8f8377]"}`}>
                                    {step.title}
                                </span>
                            </div>
                        ))}
                    </div>

                    <p className="mt-auto text-[14px] font-mono uppercase tracking-[0.2em] text-[#8f8377]">SETUP 4 DI 4</p>
                </aside>

                <main className="flex-1 bg-[#221b16] px-14 py-18">
                    <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#f7871f]">STEP 04</p>
                    <h1 className="mt-3 text-[50px] font-bold leading-[1.08] tracking-[-0.02em] text-white">Sync cifrato (opzionale)</h1>
                    <p className="mt-6 max-w-[700px] text-[14px] leading-relaxed text-[#9d9184]">
                        Abilita il backup end-to-end su Cloudflare R2. La passphrase resta locale: senza di essa nessuno — nemmeno noi — può leggere i tuoi file.
                    </p>

                    <div className="mt-9 grid max-w-[700px] grid-cols-2 gap-4">
                        {syncModes.map((mode) => (
                            <button
                                key={mode.id}
                                className={`rounded-2xl border px-5 py-5 text-left transition ${mode.active
                                    ? "border-[#f7871f] bg-[#4d2c17]"
                                    : "border-white/10 bg-[#1b1612]"
                                    }`}
                            >
                                <p className={`text-[20px] font-bold leading-tight ${mode.active ? "text-[#f7871f]" : "text-white"}`}>{mode.title}</p>
                                <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.08em] text-[#9d9184]">{mode.subtitle}</p>
                            </button>
                        ))}
                    </div>

                    <div className="mt-7 max-w-[700px]">
                        <label className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#9d9184]">PASSPHRASE (MIN. 12 CARATTERI)</label>
                        <div className="mt-2 flex h-[48px] items-center rounded-[12px] border border-white/10 bg-[#1b1612] px-4 text-[14px] font-semibold tracking-[0.12em] text-white">
                            {passphrase}
                        </div>
                    </div>

                    <div className="mt-5 max-w-[700px] rounded-2xl border border-white/10 bg-[#1b1612] px-4 py-4">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#9d9184]">RECOVERY CODE</p>
                            <button className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#f7871f]">Copia</button>
                        </div>
                        <p className="mt-3 text-[14px] font-semibold tracking-[0.06em] text-white">{recoveryCode}</p>
                        <p className="mt-3 text-[12px] text-[#9d9184]">
                            Conservalo offline. È l&apos;unico modo per recuperare i dati in caso di passphrase persa.
                        </p>
                    </div>

                    <div className="mt-9 flex max-w-[700px] items-center justify-between gap-3">
                        <button className="text-[14px] font-semibold text-[#9d9184] transition hover:text-white">Configura dopo</button>

                        <div className="flex items-center gap-3">
                            <button className="rounded-2xl border border-white/15 bg-[#1b1612] px-8 py-3 text-[14px] font-semibold text-white transition hover:bg-[#231c17]">
                                Indietro
                            </button>
                            <button className="rounded-2xl bg-[#f7871f] px-8 py-3 text-[14px] font-semibold text-white shadow-[0_8px_22px_rgba(247,135,31,0.35)] transition hover:bg-[#ff9b37]">
                                Fine · avvia l&apos;app
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
