"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getApiBaseUrl, isTauri } from "../../shared/tauri";
import { useAuth } from "../../shared/auth";

const API_BASE = getApiBaseUrl();

type StepStatus = "pending" | "running" | "done" | "error";

interface Step {
    id: string;
    label: string;
    status: StepStatus;
    message?: string;
}

// Fix 16/10 (QA C4): esiste una sessione ricordata? Controlla localStorage
// (web remember-me) e, su desktop, il token nel Tauri store (load_jwt).
// La startup usa questo per decidere se andare DIRETTAMENTE all'editor invece
// che al login: il primo getMe() può fallire per timing anche quando l'utente
// è ricordato (console: /pdfs 401 ok ma /auth/me ancora non pronto).
async function hasStoredSession(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    if (localStorage.getItem("pdfeditor_remember_token")) return true;
    if (isTauri()) {
        try {
            const { tauriInvoke } = await import("../../shared/tauri");
            const tok = await tauriInvoke<string>("load_jwt");
            return !!tok;
        } catch {
            return false;
        }
    }
    return false;
}

export default function StartupPage() {
    const router = useRouter();
    const tc = useTranslations("common");
    const ts = useTranslations("startup");
    const { refreshSession } = useAuth();
    // Step REALI (fix 16/10): il backend esegue le migrazioni PRIMA di servire
    // /health, quindi quando /health risponde il DB è già pronto → niente timer
    // finto che fa diventare lo step database verde "a caso" alle 400ms.
    const [steps, setSteps] = React.useState<Step[]>([
        // QA C5: 2 step REALI (backend -> api). Lo step "database" era ridondante:
        // le migrazioni avvengono prima di /health, quindi diventava verde insieme
        // al backend e dava l'impressione di "verdi tutti insieme a caso".
        { id: "backend", label: ts("startingBackend"), status: "running" },
        { id: "api", label: ts("verifyingApi"), status: "pending" },
    ]);
    const [allDone, setAllDone] = React.useState(false);
    const [fatalError, setFatalError] = React.useState<string | null>(null);
    // Il redirect viene gestito UNA sola volta quando allDone diventa true
    // (evita re-trigger multipli / loop infiniti al re-render).
    const redirectHandledRef = React.useRef(false);

    // Step 1: wait for sidecar health check
    React.useEffect(() => {
        let cancelled = false;

        async function waitForBackend() {
            for (let i = 0; i < 60 && !cancelled; i++) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000);
                    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (res.ok) {
                        // Backend su: le migrazioni DB sono già state fatte prima di
                        // servire /health, quindi è davvero pronto. QA C5: segniamo
                        // done solo il backend, poi l'API viene verificata davvero.
                        if (!cancelled) {
                            setSteps((prev) =>
                                prev.map((s) =>
                                    s.id === "backend" ? { ...s, status: "done" as const } : s
                                )
                            );
                        }
                        return;
                    }
                } catch {
                    // Sidecar non ancora pronto (ECONNREFUSED, timeout, ecc.):
                    // continuiamo a ritentare — mostriamo errore solo se TUTTI
                    // i 60 tentativi falliscono (blocco if (!cancelled) dopo il loop).
                }
                await new Promise((r) => setTimeout(r, 1000));
            }
            if (!cancelled) {
                setSteps((prev) =>
                    prev.map((s) => s.id === "backend" ? {
                        ...s, status: "error" as const,
                        message: ts("timeoutError")
                    } : s)
                );
                setFatalError(ts("fatalError"));
            }
        }

        waitForBackend();
        return () => { cancelled = true; };
    }, []);

    // Step 2: una volta che il backend è su, passa la verifica all'API.
    React.useEffect(() => {
        const backendStep = steps.find((s) => s.id === "backend");
        if (!backendStep || backendStep.status !== "done") return;
        setSteps((prev) =>
            prev.map((s) => (s.id === "api" ? { ...s, status: "running" as const } : s))
        );
    }, [steps.find((s) => s.id === "backend")?.status]);

    // Step 3: verifica API (readiness reale via /pdfs) poi redirect.
    React.useEffect(() => {
        const backendStep = steps.find((s) => s.id === "backend");
        if (!backendStep || backendStep.status !== "done") return;

        let cancelled = false;

        async function verifyApi() {
            // Actually verify the API is ready by calling listPdfs
            for (let i = 0; i < 30 && !cancelled; i++) {
                try {
                    const res = await fetch(`${API_BASE}/pdfs?skip=0&limit=1`);
                    // 401 means the API is working (just needs auth) — treat as success
                    if (res.ok || res.status === 401) {
                        if (!cancelled) {
                            setSteps((prev) =>
                                prev.map((s) => s.id === "api" ? { ...s, status: "done" as const } : s)
                            );
                            setAllDone(true);
                        }
                        return;
                    }
                } catch {
                    // API not ready yet (connection refused, timeout, etc.)
                }
                await new Promise((r) => setTimeout(r, 500));
            }
            // All attempts failed — show error instead of passing through
            if (!cancelled) {
                setSteps((prev) =>
                    prev.map((s) => s.id === "api" ? {
                        ...s, status: "error" as const,
                        message: ts("apiError")
                    } : s)
                );
                setFatalError(ts("fatalError"));
            }
        }
        verifyApi();
        return () => { cancelled = true; };
    }, [steps.find((s) => s.id === "backend")?.status]);

    // Redirect ONLY when allDone: verifica della sessione (una volta sola) e
    // destinazione: /app se autenticato, altrimenti /login o /wizard.
    // Il sync cloud NON blocca più la start-up: gira solo nell'editor
    // (barra PDF) dopo il mount.
    React.useEffect(() => {
        if (!allDone || redirectHandledRef.current) return;
        redirectHandledRef.current = true;
        let cancelled = false;
        // Fix 16/10 (QA C3): senza timeout il redirect poteva restare appeso a
        // refreshSession() e la pagina restava "tutta verde" bloccata. Ogni tentativo
        // ha un timeout (2.5s) e il redirect NAVIGA comunque entro pochi secondi.
        const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
            Promise.race([
                p,
                new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
            ]);
        const redirectTimer = setTimeout(async () => {
            if (cancelled) return;
            // QA C5: se esiste una sessione ricordata andiamo SUBITO all'editor,
            // senza aspettare il retry di refreshSession() (che col sidecar appena
            // su può tardare: era la "pausa" residua che vedevi). Dal login si passa
            // SOLO se davvero non c'è nessuna sessione salvata.
            const remembered = await hasStoredSession();
            if (cancelled) return;
            if (remembered) {
                // QA C6 (suggerimento Mirko): se c'è un utente loggato, avviamo
                // refreshSession() in PARALLELO (non bloccante) PRIMA di entrare
                // nell'editor, così il nome reale è già pronto alla sidebar e la
                // pagina profilo non resta più in loading. Non lo attendiamo per
                // il redirect (sarebbe l'attesa che abbiamo tolto in C5).
                refreshSession().catch(() => {});
                router.replace("/app");
                return;
            }
            // Nessuna sessione salvata: prova a ripristinare (web cookie / cloud),
            // poi vai a /app se autenticato, altrimenti login o wizard.
            let restoredUser = null;
            for (let i = 0; i < 2 && !cancelled; i++) {
                try {
                    restoredUser = await withTimeout(refreshSession(), 2500);
                } catch {
                    restoredUser = null;
                }
                if (restoredUser) break;
                if (cancelled) return;
                await new Promise((r) => setTimeout(r, 300));
            }
            if (cancelled) return;
            if (restoredUser) {
                router.replace("/app");
                return;
            }
            const wizardDone = localStorage.getItem("pdfeditor_wizard_done");
            router.replace(wizardDone === "true" ? "/login" : "/wizard");
        }, 120);
        return () => {
            cancelled = true;
            clearTimeout(redirectTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allDone]);

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
        redirectHandledRef.current = false;
        setSteps([
            { id: "backend", label: ts("startingBackend"), status: "running" },
            { id: "api", label: ts("verifyingApi"), status: "pending" },
        ]);
    }

    return (
        <div className="h-screen bg-[#17120f] font-sans text-[#f4f1ee] transition-colors flex items-center justify-center">
            <div className="w-full max-w-md px-6">
                <div className="mb-10 inline-flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#f7871f] shadow-[0_8px_20px_rgba(247,135,31,0.35)] mx-auto block">
                    <div className="h-8 w-6 rounded-[8px] bg-[#fff8f2]" />
                </div>

                <h1 className="text-center text-2xl font-bold text-white mb-8">{ts("startingApp")}</h1>

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
                        <button onClick={handleRetry} className="cursor-pointer rounded-xl bg-[#f7871f] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff9b37]">
                            {ts("retry")}
                        </button>
                    </div>
                )}

                {allDone && (
                    <p className="mt-6 text-center text-[13px] text-[#48c769]">
                        {ts("ready")}
                    </p>
                )}

                <p className="mt-10 text-center text-[10px] text-[#8e8175]">
                    {tc("version")} · {ts("license")}
                </p>
            </div>
        </div>
    );
}