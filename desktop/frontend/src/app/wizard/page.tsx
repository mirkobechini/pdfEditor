"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { isTauri, tauriInvoke } from "../../shared/tauri";
import { usePreferences } from "../../lib/preferences";

/** Open a URL in the system browser (works in Tauri webview). */
async function openExternal(url: string) {
    // With withGlobalTauri: true, window.__TAURI__.opener is available
    try {
        await window.__TAURI__?.opener?.openUrl(url);
        return;
    } catch {
        // fallback for non-Tauri
        window.open(url, "_blank");
    }
}

/** Open a directory picker dialog (Tauri native) or fallback to manual input. */
async function pickDirectory(): Promise<string | null> {
    try {
        // With withGlobalTauri: true, window.__TAURI__.dialog is available
        const selected = await window.__TAURI__?.dialog?.open({
            directory: true,
            multiple: false,
            title: "Seleziona cartella di lavoro",
        });
        return (selected as string) || null;
    } catch {
        return null;
    }
}

const steps = [
    { id: "01", title: "title" },
    { id: "02", title: "workFolder" },
] as const;

export default function WizardPage() {
    const router = useRouter();
    const tw = useTranslations("wizard");
    const { prefs, updatePrefs } = usePreferences();
    const [currentStep, setCurrentStep] = React.useState(0);
    const [workFolder, setWorkFolder] = React.useState(prefs.default_save_folder || "");
    const [indexing, setIndexing] = React.useState(false);
    const [acceptedTerms, setAcceptedTerms] = React.useState(false);

    function handleNext() {
        if (currentStep < steps.length - 1) {
            setCurrentStep((s) => s + 1);
        }
    }

    function handleFinish() {
        if (workFolder.trim()) {
            updatePrefs({ default_save_folder: workFolder.trim() });
        }
        router.push("/app");
    }

    function handleBack() {
        if (currentStep > 0) {
            setCurrentStep((s) => s - 1);
        }
    }

    function handleSkip() {
        localStorage.setItem("pdfeditor_wizard_done", "true");
        router.push("/login");
    }

    function renderStepContent() {
        switch (currentStep) {
            case 0:
                return (
                    <>
                        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#f7871f]">{tw("step01")}</p>
                        <h1 className="mt-3 text-[50px] font-bold leading-[1.08] tracking-[-0.02em] text-white">{tw("welcomeTitle")}</h1>
                        <p className="mt-6 max-w-[700px] text-[14px] leading-relaxed text-[#9d9184]">
                            {tw("welcomeDesc")}
                        </p>
                        <div className="mt-9 max-w-[700px] rounded-2xl border border-white/10 bg-[#1b1612] p-6">
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={acceptedTerms}
                                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent accent-[#f7871f]"
                                />
                                <span className="text-[14px] leading-relaxed text-[#9d9184]">
                                    {tw("acceptTerms")}{" "}
                                    <button type="button" onClick={() => openExternal("https://pdfeditor.mirkobechini.com/terms")} className="cursor-pointer text-[#f7871f] underline hover:text-[#ff9b37]">{tw("licenseTerms")}</button> e la{" "}
                                    <button type="button" onClick={() => openExternal("https://www.iubenda.com/privacy-policy/76778813")} className="cursor-pointer text-[#f7871f] underline hover:text-[#ff9b37]">{tw("privacyPolicy")}</button>
                                </span>
                            </div>
                        </div>
                    </>
                );
            case 1:
                return (
                    <>
                        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#f7871f]">{tw("step02")}</p>
                        <h1 className="mt-3 text-[50px] font-bold leading-[1.08] tracking-[-0.02em] text-white">{tw("workFolder")}</h1>
                        <p className="mt-6 max-w-[700px] text-[14px] leading-relaxed text-[#9d9184]">
                            {tw("workFolderDesc")}
                        </p>
                        <div className="mt-9 max-w-[700px]">
                            <label className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#9d9184]">{tw("folderPath")}</label>
                            <div className="mt-2 flex h-[48px] items-center gap-2">
                                <input
                                    type="text"
                                    value={workFolder}
                                    onChange={(e) => setWorkFolder(e.target.value)}
                                    placeholder={tw("folderPlaceholder")}
                                    className="h-full flex-1 rounded-[12px] border border-white/10 bg-[#1b1612] px-4 text-[14px] font-semibold text-white outline-none transition focus:border-[#f7871f]"
                                />
                                <button
                                    onClick={async () => {
                                        const folder = await pickDirectory();
                                        if (folder) setWorkFolder(folder);
                                    }}
                                    className="h-full cursor-pointer rounded-[12px] border border-white/15 bg-[#1b1612] px-6 text-[13px] font-semibold text-white transition hover:bg-[#231c17]"
                                >
                                    {tw("browse")}
                                </button>
                            </div>
                        </div>
                        <div className="mt-5 max-w-[700px] rounded-2xl border border-white/10 bg-[#1b1612] p-4">
                            <label className="flex cursor-pointer items-center justify-between">
                                <div>
                                    <p className="text-[14px] font-semibold text-white">{tw("fileIndexing")}</p>
                                    <p className="text-[12px] text-[#9d9184]">{tw("fileIndexingDesc")}</p>
                                </div>
                                <div
                                    className={`relative h-6 w-11 cursor-pointer rounded-full transition ${indexing ? "bg-[#f7871f]" : "bg-white/15"}`}
                                    onClick={() => setIndexing(!indexing)}
                                >
                                    <div className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${indexing ? "translate-x-5" : ""}`} />
                                </div>
                            </label>
                        </div>
                    </>
                );
        }
    }

    return (
        <div className="min-h-screen bg-[#17120f] p-[3px] text-[#f4f1ee]">
            <div className="mx-auto flex min-h-[calc(100vh-6px)] w-full max-w-[1330px] overflow-hidden rounded-[22px] border border-white/10 bg-[#201a15]">
                <aside className="flex w-[312px] flex-col border-r border-white/10 bg-[#1f1914] p-7">
                    <div className="mb-10 inline-flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#f7871f] shadow-[0_8px_20px_rgba(247,135,31,0.35)]">
                        <div className="h-8 w-6 rounded-[8px] bg-[#fff8f2]" />
                    </div>
                    <div className="space-y-3">
                        {steps.map((step, i) => (
                            <div key={step.id} className={`flex items-center gap-3 rounded-2xl px-4 py-4 ${i === currentStep ? "border border-white/12 bg-white/[0.02]" : "border border-transparent"}`}>
                                {i < currentStep ? (
                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#f7871f] text-[15px] font-bold leading-none text-white">✓</span>
                                ) : (
                                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-bold ${i === currentStep ? "border border-[#8a4f22] bg-[#3c2516] text-[#f7871f]" : "border border-white/10 bg-white/[0.04] text-[#8b7f73]"}`}>{step.id}</span>
                                )}
                                <span className={`text-[14px] leading-tight ${i === currentStep ? "font-semibold text-white" : "text-[#8f8377]"}`}>{tw(step.title)}</span>
                            </div>
                        ))}
                    </div>
                    <p className="mt-auto text-[14px] font-mono uppercase tracking-[0.2em] text-[#8f8377]">{tw("setupProgress", { current: currentStep + 1, total: 2 })}</p>
                </aside>
                <main className="flex-1 bg-[#221b16] px-14 py-18">
                    {renderStepContent()}
                    <div className="mt-9 flex max-w-[700px] items-center justify-between gap-3">
                        <button onClick={handleSkip} className="cursor-pointer text-[14px] font-semibold text-[#9d9184] transition hover:text-white">{tw("skip")}</button>
                        <div className="flex items-center gap-3">
                            {currentStep > 0 && (
                                <button onClick={handleBack} className="cursor-pointer rounded-2xl border border-white/15 bg-[#1b1612] px-8 py-3 text-[14px] font-semibold text-white transition hover:bg-[#231c17]">{tw("back")}</button>
                            )}
                            {currentStep < 1 ? (
                                <button onClick={handleNext} disabled={currentStep === 0 && !acceptedTerms} className="cursor-pointer rounded-2xl bg-[#f7871f] px-8 py-3 text-[14px] font-semibold text-white shadow-[0_8px_22px_rgba(247,135,31,0.35)] transition hover:bg-[#ff9b37] disabled:cursor-not-allowed disabled:opacity-50">{tw("continue")}</button>
                            ) : (
                                <button onClick={handleFinish} className="cursor-pointer rounded-2xl bg-[#f7871f] px-8 py-3 text-[14px] font-semibold text-white shadow-[0_8px_22px_rgba(247,135,31,0.35)] transition hover:bg-[#ff9b37]">{tw("finish")}</button>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
