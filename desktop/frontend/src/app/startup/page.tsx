"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "../../shared/tauri";

const API_BASE = getApiBaseUrl();

type StepStatus = "pending" | "running" | "done" | "error";

interface Step {
    id: string;
    label: string;
    status: StepStatus;
    message?: string;
}

export default function StartupPage() {
    const router = useRouter();
    const [steps, setSteps] = React.useState<Step[]>([
        { id: "sidecar", label: "Avvio del backend in locale...", status: "running" },
        { id: "database", label: "Connessione al database...", status: "pending" },
        { id: "api", label: "Verifica API e servizi...", status: "pending" },
    ]);
    const [allDone, setAllDone] = React.useState(false);
    const [fatalError, setFatalError] = React.useState<string | null>(null);

    // Step 1: wait for sidecar health check
    React.useEffect(() => {
        let cancelled = false;

        async function waitForSidecar() {
            for (let i = 0; i < 60 && !cancelled; i++) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000);
                    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (res.ok) {
                        if (!cancelled) {
                            setSteps((prev) =>
                                prev.map((s) =>
                                    s.id === "sidecar" ? { ...s, status: "done" as const }
                                        : s.id === "database" ? { ...s, status: "running" as const }
                                            : s
                                )
                            );
                        }
                        return;
                    }
                } catch {
                    // not ready yet
                }
                await new Promise((r) => setTimeout(r, 1000));
            }
            if (!cancelled) {
                setSteps((prev) =>
                    prev.map((s) => s.id === "sidecar" ? { ...s, status: "error" as const, message: "Tempo scaduto. Il backend non risponde." } : s)
                );
                setFatalError("Impossibile avviare il backend. Verifica che il sidecar sia presente e riprova.");
            }
        }

        waitForSidecar();
        return () => { cancelled = true; };
    }, []);

    // Step 2: once sidecar is done, wait a moment then mark DB as done
    React.useEffect(() => {
        if (steps.find((s) => s.id === "sidecar")?.status !== "done") return;

        const timer = setTimeout(() => {
            setSteps((prev) =>
                prev.map((s) =>
                    s.id === "database" ? { ...s, status: "done" as const }
                        : s.id === "api" ? { ...s, status: "running" as const }
                            : s
                )
            );
        }, 800);

        return () => clearTimeout(timer);
    }, [steps, steps.find((s) => s.id === "sidecar")?.status]);

    // Step 3: once DB is done, verify API then redirect
    React.useEffect(() => {
        if (steps.find((s) => s.id === "database")?.status !== "done") return;

        const timer = setTimeout(() => {
            setSteps((prev) =>
                prev.map((s) => s.id === "api" ? { ...s, status: "done" as const } : s)
            );
            setAllDone(true);
        }, 600);

        return () => clearTimeout(timer);
    }, [steps, steps.find((s) => s.id === "database")?.status]);

    // Redirect to wizard (first launch) or login when all done
    React.useEffect(() => {
        if (!allDone) return;
        const redirectTimer = setTimeout(() => {
            const wizardDone = localStorage.getItem("pdfeditor_wizard_done");
            router.push(wizardDone === "true" ? "/login" : "/wizard");
        }, 1200);
        return () => clearTimeout(redirectTimer);
    }, [allDone, router]);

    function getStepIcon(status: StepStatus) {
        switch (status) {
            case "pending":
                return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-[10px] text-[#8b7f73]" />;
            case "running":
                return <span className="inline-flex h-5 w-5 items-center justify-center"><span className="h-3 w-3 animate-spin rounded-full border-2 border-[#f7871f] border-t-transparent" /></span>;
            case "done":
                return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#48c769] text-[11px] font-bold text-white">✓</span>;
            case "error":
                return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">✗</span>;
        }
    }

    function handleRetry() {
        setFatalError(null);
        setAllDone(false);
        setSteps([
            { id: "sidecar", label: "Avvio del backend in locale...", status: "running" },
            { id: "database", label: "Connessione al database...", status: "pending" },
            { id: "api", label: "Verifica API e servizi...", status: "pending" },
        ]);
    }

    return (
        <div className="h-screen bg-[#17120f] font-sans text-[#f4f1ee] transition-colors flex items-center justify-center">
            <div className="w-full max-w-md px-6">
                <div className="mb-10 inline-flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#f7871f] shadow-[0_8px_20px_rgba(247,135,31,0.35)] mx-auto block">
                    <div className="h-8 w-6 rounded-[8px] bg-[#fff8f2]" />
                </div>

                <h1 className="text-center text-2xl font-bold text-white mb-8">Avvio di PdfEditor</h1>

                <div className="space-y-4">
                    {steps.map((step) => (
                        <div key={step.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1f1914] px-4 py-3">
                            {getStepIcon(step.status)}
                            <div className="flex-1">
                                <p className={`text-[14px] leading-tight ${step.status === "error" ? "text-red-300" : step.status === "done" ? "text-[#48c769]" : "text-white"}`}>
                                    {step.label}
                                </p>
                                {step.message && (
                                    <p className="text-[12px] text-red-400 mt-0.5">{step.message}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {fatalError && (
                    <div className="mt-6 text-center">
                        <p className="text-[13px] text-red-300 mb-4">{fatalError}</p>
                        <button onClick={handleRetry} className="cursor-pointer rounded-xl bg-[#f7871f] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ce5a00]">
                            Riprova
                        </button>
                    </div>
                )}

                {allDone && (
                    <p className="mt-6 text-center text-[13px] text-[#48c769]">
                        ✓ Pronto! Reindirizzamento al login...
                    </p>
                )}

                <p className="mt-10 text-center text-[10px] text-[#8e8175]">
                    v0.1.23 · AGPL-3.0
                </p>
            </div>
        </div>
    );
}