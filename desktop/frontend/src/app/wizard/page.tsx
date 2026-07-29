"use client";

import React from "react";
import { useRouter } from "next/navigation";

const steps = [
    { id: "01", title: "Benvenuto" },
    { id: "02", title: "Attiva licenza" },
    { id: "03", title: "Cartella di lavoro" },
    { id: "04", title: "Sync opzionale" },
] as const;

const syncModes = [
    { id: "local", title: "Solo locale", subtitle: "nessun upload" },
    { id: "sync", title: "Sync cifrato", subtitle: "R2 • AES-256" },
] as const;

const passphrase = "••••••••••••••";
const recoveryCode = "R2-K3PT-9ZQA-M4XV-8LNP-BWCR";

export default function WizardPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = React.useState(0);
    const [licenseKey, setLicenseKey] = React.useState("");
    const [workFolder, setWorkFolder] = React.useState("");
    const [syncMode, setSyncMode] = React.useState("local");
    const [indexing, setIndexing] = React.useState(false);
    const [licenseAccepted, setLicenseAccepted] = React.useState(false);
    const [copied, setCopied] = React.useState(false);

    function handleNext() {
        if (currentStep < steps.length - 1) {
            setCurrentStep((s) => s + 1);
        }
    }

    function handleBack() {
        if (currentStep > 0) {
            setCurrentStep((s) => s - 1);
        }
    }

    function handleFinish() {
        localStorage.setItem("pdfeditor_wizard_done", "true");
        router.push("/login");
    }

    function handleSkip() {
        localStorage.setItem("pdfeditor_wizard_done", "true");
        router.push("/login");
    }

    async function handleCopyCode() {
        try {
            await navigator.clipboard.writeText(recoveryCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // clipboard not available
        }
    }

    function renderStepContent() {
        switch (currentStep) {
            case 0:
                return (
                    <>
                        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#f7871f]">STEP 01</p>
                        <h1 className="mt-3 text-[50px] font-bold leading-[1.08] tracking-[-0.02em] text-white">Benvenuto in PdfEditor</h1>
                        <p className="mt-6 max-w-[700px] text-[14px] leading-relaxed text-[#9d9184]">
                            Editing PDF di precisione, in locale. Il tuo workspace è cifrato nel keychain del sistema operativo.
                            Funziona offline e si sincronizza quando torni online.
                        </p>
                        <div className="mt-9 max-w-[700px] rounded-2xl border border-white/10 bg-[#1b1612] p-6">
                            <label className="flex cursor-pointer items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={licenseAccepted}
                                    onChange={(e) => setLicenseAccepted(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent accent-[#f7871f]"
                                />
                                <span className="text-[14px] leading-relaxed text-[#9d9184]">
                                    Accetto i{" "}
                                    <span className="text-[#f7871f] underline">termini di licenza</span> e la{" "}
                                    <span className="text-[#f7871f] underline">privacy policy</span>
                                </span>
                            </label>
                        </div>
                    </>
                );
            case 1:
                return (
                    <>
                        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#f7871f]">STEP 02</p>
                        <h1 className="mt-3 text-[50px] font-bold leading-[1.08] tracking-[-0.02em] text-white">Attiva la licenza</h1>
                        <p className="mt-6 max-w-[700px] text-[14px] leading-relaxed text-[#9d9184]">
                            Inserisci la chiave di licenza ricevuta via email per sbloccare tutte le funzionalità premium.
                        </p>
                        <div className="mt-9 max-w-[700px]">
                            <label className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#9d9184]">CHIAVE DI LICENZA</label>
                            <input
                                type="text"
                                value={licenseKey}
                                onChange={(e) => setLicenseKey(e.target.value)}
                                placeholder="PDFE-XXXX-XXXX-XXXX-XXXX"
                                className="mt-2 h-[48px] w-full rounded-[12px] border border-white/10 bg-[#1b1612] px-4 text-[14px] font-semibold text-white outline-none transition focus:border-[#f7871f]"
                            />
                            <p className="mt-2 text-[12px] text-[#9d9184]">
                                Non hai una chiave?{" "}
                                <span className="text-[#f7871f] underline cursor-pointer">Acquistane una</span>
                            </p>
                        </div>
                    </>
                );
            case 2:
                return (
                    <>
                        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#f7871f]">STEP 03</p>
                        <h1 className="mt-3 text-[50px] font-bold leading-[1.08] tracking-[-0.02em] text-white">Cartella di lavoro</h1>
                        <p className="mt-6 max-w-[700px] text-[14px] leading-relaxed text-[#9d9184]">
                            Scegli dove salvare i tuoi PDF e abilita l&apos;indicizzazione per ritrovarli velocemente.
                        </p>
                        <div className="mt-9 max-w-[700px]">
                            <label className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#9d9184]">PERCORSO CARTELLA</label>
                            <div className="mt-2 flex h-[48px] items-center gap-2">
                                <input
                                    type="text"
                                    value={workFolder}
                                    onChange={(e) => setWorkFolder(e.target.value)}
                                    placeholder="C:\Users\Utente\Documents\PDF"
                                    className="h-full flex-1 rounded-[12px] border border-white/10 bg-[#1b1612] px-4 text-[14px] font-semibold text-white outline-none transition focus:border-[#f7871f]"
                                />
                                <button
                                    onClick={() => {
                                        const folder = prompt("Inserisci il percorso della cartella di lavoro:");
                                        if (folder) setWorkFolder(folder);
                                    }}
                                    className="h-full rounded-[12px] border border-white/15 bg-[#1b1612] px-6 text-[13px] font-semibold text-white transition hover:bg-[#231c17]"
                                >
                                    Sfoglia…
                                </button>
                            </div>
                        </div>
                        <div className="mt-5 max-w-[700px] rounded-2xl border border-white/10 bg-[#1b1612] p-4">
                            <label className="flex cursor-pointer items-center justify-between">
                                <div>
                                    <p className="text-[14px] font-semibold text-white">Indicizzazione file</p>
                                    <p className="text-[12px] text-[#9d9184]">Cerca e organizza automaticamente i PDF</p>
                                </div>
                                <div
                                    className={`relative h-6 w-11 rounded-full transition ${indexing ? "bg-[#f7871f]" : "bg-white/15"}`}
                                    onClick={() => setIndexing(!indexing)}
                                >
                                    <div className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${indexing ? "translate-x-5" : ""}`} />
                                </div>
                            </label>
                        </div>
                    </>
                );
            case 3:
                return (
                    <>
                        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#f7871f]">STEP 04</p>
                        <h1 className="mt-3 text-[50px] font-bold leading-[1.08] tracking-[-0.02em] text-white">Sync cifrato (opzionale)</h1>
                        <p className="mt-6 max-w-[700px] text-[14px] leading-relaxed text-[#9d9184]">
                            Abilita il backup end-to-end su Cloudflare R2. La passphrase resta locale: senza di essa nessuno — nemmeno noi — può leggere i tuoi file.
                        </p>

                        <div className="mt-9 grid max-w-[700px] grid-cols-2 gap-4">
                            {syncModes.map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => setSyncMode(mode.id)}
                                    className={`rounded-2xl border px-5 py-5 text-left transition ${syncMode === mode.id
                                        ? "border-[#f7871f] bg-[#4d2c17]"
                                        : "border-white/10 bg-[#1b1612]"
                                        }`}
                                >
                                    <p className={`text-[20px] font-bold leading-tight ${syncMode === mode.id ? "text-[#f7871f]" : "text-white"}`}>{mode.title}</p>
                                    <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.08em] text-[#9d9184]">{mode.subtitle}</p>
                                </button>
                            ))}
                        </div>

                        {syncMode === "sync" && (
                            <>
                                <div className="mt-7 max-w-[700px]">
                                    <label className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#9d9184]">PASSPHRASE (MIN. 12 CARATTERI)</label>
                                    <div className="mt-2 flex h-[48px] items-center rounded-[12px] border border-white/10 bg-[#1b1612] px-4 text-[14px] font-semibold tracking-[0.12em] text-white">
                                        {passphrase}
                                    </div>
                                </div>

                                <div className="mt-5 max-w-[700px] rounded-2xl border border-white/10 bg-[#1b1612] px-4 py-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#9d9184]">RECOVERY CODE</p>
                                        <button onClick={handleCopyCode} className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#f7871f]">
                                            {copied ? "Copiato!" : "Copia"}
                                        </button>
                                    </div>
                                    <p className="mt-3 text-[14px] font-semibold tracking-[0.06em] text-white">{recoveryCode}</p>
                                    <p className="mt-3 text-[12px] text-[#9d9184]">
                                        Conservalo offline. È l&apos;unico modo per recuperare i dati in caso di passphrase persa.
                                    </p>
                                </div>
                            </>
                        )}
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
                            <div
                                key={step.id}
                                className={`flex items-center gap-3 rounded-2xl px-4 py-4 ${i === currentStep ? "border border-white/12 bg-white/[0.02]" : "border border-transparent"
                                    }`}
                            >
                                {i < currentStep ? (
                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#f7871f] text-[15px] font-bold leading-none text-white">
                                        ✓
                                    </span>
                                ) : (
                                    <span
                                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-bold ${i === currentStep
                                            ? "border border-[#8a4f22] bg-[#3c2516] text-[#f7871f]"
                                            : "border border-white/10 bg-white/[0.04] text-[#8b7f73]"
                                            }`}
                                    >
                                        {step.id}
                                    </span>
                                )}
                                <span className={`text-[14px] leading-tight ${i === currentStep ? "font-semibold text-white" : "text-[#8f8377]"}`}>
                                    {step.title}
                                </span>
                            </div>
                        ))}
                    </div>

                    <p className="mt-auto text-[14px] font-mono uppercase tracking-[0.2em] text-[#8f8377]">SETUP {currentStep + 1} DI 4</p>
                </aside>

                <main className="flex-1 bg-[#221b16] px-14 py-18">
                    {renderStepContent()}

                    <div className="mt-9 flex max-w-[700px] items-center justify-between gap-3">
                        <button onClick={handleSkip} className="text-[14px] font-semibold text-[#9d9184] transition hover:text-white">
                            {currentStep < 3 ? "Salta" : "Configura dopo"}
                        </button>

                        <div className="flex items-center gap-3">
                            {currentStep > 0 && (
                                <button onClick={handleBack} className="rounded-2xl border border-white/15 bg-[#1b1612] px-8 py-3 text-[14px] font-semibold text-white transition hover:bg-[#231c17]">
                                    Indietro
                                </button>
                            )}
                            {currentStep < 3 ? (
                                <button
                                    onClick={handleNext}
                                    disabled={currentStep === 0 && !licenseAccepted}
                                    className="rounded-2xl bg-[#f7871f] px-8 py-3 text-[14px] font-semibold text-white shadow-[0_8px_22px_rgba(247,135,31,0.35)] transition hover:bg-[#ff9b37] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Continua
                                </button>
                            ) : (
                                <button onClick={handleFinish} className="rounded-2xl bg-[#f7871f] px-8 py-3 text-[14px] font-semibold text-white shadow-[0_8px_22px_rgba(247,135,31,0.35)] transition hover:bg-[#ff9b37]">
                                    Fine · avvia l&apos;app
                                </button>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
