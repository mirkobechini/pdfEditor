"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getApiBaseUrl } from "../../shared/tauri";
import { useAuth } from "../../shared/auth";
import { useCloudSyncContext } from "../../hooks/CloudSyncContext";

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
    const tc = useTranslations("common");
    const ts = useTranslations("startup");
    const { refreshSession } = useAuth();
    // Istanza condivisa del sync cloud (unica per l'app, non un nuovo hook).
    const cloudSync = useCloudSyncContext();
    const [steps, setSteps] = React.useState<Step[]>([
        { id: "backend", label: ts("startingBackend"), status: "running" },
        { id: "database", label: ts("connectingDb"), status: "pending" },
        { id: "api", label: ts("verifyingApi"), status: "pending" },
        { id: "sync", label: ts("syncingCloud"), status: "pending" },
    ]);
    const [allDone, setAllDone] = React.useState(false);
    const [fatalError, setFatalError] = React.useState<string | null>(null);
    // Esito del retry di refreshSession fatto al boot: checked=true dopo il
    // primo tentativo, authenticated=true se c'è una sessione valida (→ /app).
    const [session, setSession] = React.useState<{ checked: boolean; authenticated: boolean }>({
        checked: false,
        authenticated: false,
    });
    // Quando NON si è autenticati (si va a login/wizard) non c'è nulla da
    // sincronizzare: lo step sync viene marcato come done (saltato) così non
    // resta pending per sempre.
    const [syncSkipped, setSyncSkipped] = React.useState(false);
    // Guardia per non rilanciare refreshSession/triggerInitialSync più volte
    // quando allDone diventa true (evita doppi trigger / loop infiniti).
    const bootHandledRef = React.useRef(false);

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
                        if (!cancelled) {
                            setSteps((prev) =>
                                prev.map((s) =>
                                    s.id === "backend" ? { ...s, status: "done" as const }
                                        : s.id === "database" ? { ...s, status: "running" as const }
                                            : s
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

    // Step 2: once backend is done, mark DB as done with brief delay
    React.useEffect(() => {
        const backendStep = steps.find((s) => s.id === "backend");
        if (!backendStep || backendStep.status !== "done") return;

        const timer = setTimeout(() => {
            setSteps((prev) =>
                prev.map((s) =>
                    s.id === "database" ? { ...s, status: "done" as const }
                        : s.id === "api" ? { ...s, status: "running" as const }
                            : s
                )
            );
        }, 400);

        return () => clearTimeout(timer);
    }, [steps.find((s) => s.id === "backend")?.status]);

    // Step 3: once DB is done, verify API then redirect
    React.useEffect(() => {
        const dbStep = steps.find((s) => s.id === "database");
        if (!dbStep || dbStep.status !== "done") return;

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
    }, [steps.find((s) => s.id === "database")?.status]);

    // Sync (4° step) + retry di refreshSession SOLO dopo i primi 3 step
    // (allDone). L'autenticazione viene verificata qui una volta sola.
    // - Se c'è una sessione valida → parte il sync (guardia per-utente evita
    //   doppio sync: se è partito qui, l'editor al mount non lo rilancia).
    // - Se NON si è autenticati → si andrà a login/wizard, non c'è nulla da
    //   sincronizzare: lo step sync viene marcato done (saltato) subito.
    React.useEffect(() => {
        if (!allDone || bootHandledRef.current) return;
        bootHandledRef.current = true;
        let cancelled = false;
        (async () => {
            const restoredUser = await refreshSession();
            if (cancelled) return;
            if (restoredUser) {
                setSession({ checked: true, authenticated: true });
                await cloudSync.triggerInitialSync();
            } else {
                setSession({ checked: true, authenticated: false });
                setSyncSkipped(true);
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allDone]);

    // Redirect ONLY when the sync step has settled (done/error), mai mentre è
    // ancora pending. Il retry di refreshSession è già avvenuto nell'effect
    // precedente (backend confermato sano → non può perdere la race): qui
    // decidiamo la destinazione in base all'esito salvato in `session`.
    const syncStep = steps.find((s) => s.id === "sync");
    const syncSettled = !!syncStep && (syncStep.status === "done" || syncStep.status === "error");
    React.useEffect(() => {
        if (!allDone || !syncSettled || !session.checked) return;
        let cancelled = false;
        const redirectTimer = setTimeout(() => {
            if (cancelled) return;
            if (session.authenticated) {
                router.push("/app");
                return;
            }
            const wizardDone = localStorage.getItem("pdfeditor_wizard_done");
            router.push(wizardDone === "true" ? "/login" : "/wizard");
        }, 1200);
        return () => {
            cancelled = true;
            clearTimeout(redirectTimer);
        };
    }, [allDone, syncSettled, session.checked, session.authenticated, router]);

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

    // Step 4: indicatore di sync cloud condiviso (useCloudSyncContext).
    // Stesso comportamento visivo degli altri 3 step:
    // - pending (vuoto) finché non parte;
    // - running (spinner) durante isSyncing;
    // - done (verde ✓) se finito senza errori;
    // - error (rosso ✗) se fallito.
    React.useEffect(() => {
        const syncStep = steps.find((s) => s.id === "sync");
        if (!syncStep) return;
        let status: StepStatus = syncStep.status;
        if (syncSkipped) {
            // Non autenticato: sync saltato → done subito, non resta pending.
            status = "done";
        } else if (cloudSync.isSyncing) {
            status = "running";
        } else if (cloudSync.lastSyncResult) {
            status =
                cloudSync.lastSyncResult.errors.length > 0 ? "error" : "done";
        } else {
            // Sync non ancora partito: resta a pending (vuoto), mai "done"
            // prematuro. Diventa done solo con un lastSyncResult senza errori.
            status = "pending";
        }
        if (status === syncStep.status) return;
        setSteps((prev) =>
            prev.map((s) => (s.id === "sync" ? { ...s, status } : s)),
        );
    }, [cloudSync.isSyncing, cloudSync.lastSyncResult, syncSkipped, steps.find((s) => s.id === "sync")?.status]);

    function handleRetry() {
        setFatalError(null);
        setAllDone(false);
        setSession({ checked: false, authenticated: false });
        setSyncSkipped(false);
        bootHandledRef.current = false;
        setSteps([
            { id: "backend", label: ts("startingBackend"), status: "running" },
            { id: "database", label: ts("connectingDb"), status: "pending" },
            { id: "api", label: ts("verifyingApi"), status: "pending" },
            { id: "sync", label: ts("syncingCloud"), status: "pending" },
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

                {allDone && syncSettled && (
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