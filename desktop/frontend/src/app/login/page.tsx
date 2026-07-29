"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "../../shared/auth";
import { mapError } from "../../shared/error-map";
import { getApiBaseUrl } from "../../shared/tauri";
import PasswordInput from "../../components/PasswordInput";
import GoogleLoginButton from "../../components/GoogleLoginButton";

const SIDECAR_HEALTH_URL = getApiBaseUrl() + "/health";
const HEALTH_RETRY_INTERVAL = 1000; // 1 second
const HEALTH_MAX_RETRIES = 15; // 15 seconds max

function useSidecarReady() {
    const [ready, setReady] = React.useState(false);
    const [checking, setChecking] = React.useState(true);
    const [failed, setFailed] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        let attempts = 0;

        async function poll() {
            while (attempts < HEALTH_MAX_RETRIES && !cancelled) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    const res = await fetch(SIDECAR_HEALTH_URL, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (res.ok) {
                        if (!cancelled) {
                            setReady(true);
                            setChecking(false);
                        }
                        return;
                    }
                } catch {
                    // Sidecar not ready yet (network error or abort)
                }
                attempts++;
                await new Promise((r) => setTimeout(r, HEALTH_RETRY_INTERVAL));
            }
            if (!cancelled) {
                setChecking(false);
                setFailed(true);
            }
        }

        poll();
        return () => { cancelled = true; };
    }, []);

    return { ready, checking, failed };
}

export default function LoginPage() {
    const t = useTranslations("auth");
    const tc = useTranslations("common");
    const { user, loading, login, guestLogin } = useAuth();
    const { ready, checking, failed } = useSidecarReady();
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [remember, setRemember] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);
    const [googleResetKey, setGoogleResetKey] = React.useState(0);

    React.useEffect(() => {
        if (!loading && user) {
            window.location.href = "/app";
        }
    }, [loading, user]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim() || !password.trim()) return;
        setSubmitting(true);
        setError(null);
        setGoogleResetKey((k) => k + 1);
        try {
            await login(email.trim(), password, remember);
            window.location.href = "/app";
        } catch (err) {
            const key = mapError(err);
            const ns = key.split(".")[0];
            const k = key.substring(ns.length + 1);
            setError(ns === "common" ? tc(k) : t(k));
        } finally {
            setSubmitting(false);
        }
    }

    if (user) {
        return <div className="h-screen bg-white dark:bg-gray-950" />;
    }

    // Show a loading indicator while the sidecar is starting up
    if (checking && !ready && !failed) {
        return (
            <div className="h-screen bg-[#17120f] flex items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#f7871f] border-t-transparent" />
                    <p className="text-sm text-[#a79a8d]">{tc("loading")}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#17120f] font-sans text-[#f4f1ee] transition-colors">
            <div className="grid h-full grid-cols-1 lg:grid-cols-2">
                <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#f7871f] to-[#ce5a00] p-10 text-white">
                    <div className="inline-flex h-[86px] w-[86px] items-center justify-center rounded-3xl bg-white/15">
                        <div className="relative h-11 w-9 rounded-[10px] bg-[#fff6ee]">
                            <span className="absolute left-2 top-2 h-[2px] w-5 rounded bg-[#e8c9ac]" />
                            <span className="absolute left-2 top-4 h-[2px] w-4 rounded bg-[#e8c9ac]" />
                            <span className="absolute left-2 top-6 h-[2px] w-5 rounded bg-[#e8c9ac]" />
                            <span className="absolute bottom-1 right-1 h-[7px] w-[7px] rounded-full border border-[#f7871f]" />
                        </div>
                    </div>

                    <div>
                        <h1 className="mb-6 max-w-sm text-3xl font-bold leading-tight tracking-tight">
                            Editing PDF di precisione. In locale.
                        </h1>
                        <p className="mb-6 max-w-sm text-sm leading-relaxed text-white/85">
                            Il tuo workspace è cifrato nel keychain del sistema operativo. Funziona offline e si sincronizza quando torni online.
                        </p>
                        <div className="flex gap-2">
                            <span className="rounded-full bg-white/20 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest">OFFLINE-FIRST</span>
                            <span className="rounded-full bg-white/20 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest">E2E</span>
                            <span className="rounded-full bg-white/20 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest">AGPL</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col justify-center bg-[#201a15] p-10">
                    <div className="mx-auto w-full max-w-sm">
                        {error && (
                            <div className="mb-4 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
                        )}

                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#a79a8d]">WELCOME BACK</p>
                        <h2 className="mb-8 text-2xl font-bold tracking-tight text-[#f4f1ee]">{t("workspace")}</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#a79a8d]">{t("email")}</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="email@esempio.com"
                                    required
                                    autoFocus
                                    className="h-11 w-full rounded-xl border border-white/10 bg-transparent px-4 text-sm font-medium text-[#f4f1ee] outline-none transition focus:border-[#f7871f]"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#a79a8d]">{t("password")}</label>
                                <PasswordInput value={password} onChange={setPassword} placeholder="••••••••••••" required />
                            </div>

                            <div className="flex items-center justify-between text-xs">
                                <label className="flex cursor-pointer items-center gap-2 text-[#a79a8d]">
                                    <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#f7871f]">
                                        <input
                                            type="checkbox"
                                            checked={remember}
                                            onChange={(e) => setRemember(e.target.checked)}
                                            className="absolute inset-0 cursor-pointer opacity-0"
                                        />
                                        <span className="text-[10px] font-black text-white">✓</span>
                                    </span>
                                    {t("rememberMe")}
                                </label>
                                <Link href="/forgot-password" className="font-medium text-[#f7871f]">
                                    Recupera password
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || !email.trim() || !password.trim()}
                                className="mb-4 w-full rounded-xl bg-[#f7871f] py-3 text-sm font-semibold text-white shadow-sm shadow-[#f7871f]/30 transition-colors hover:bg-[#ce5a00] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {submitting ? tc("loading") : t("loginButton")}
                            </button>
                        </form>

                        <div className="mb-4 flex items-center gap-2">
                            <hr className="flex-1 border-white/10" />
                            <span className="bg-[#201a15] px-3 font-mono text-[10px] uppercase tracking-widest text-[#a79a8d]">{t("or").toUpperCase()}</span>
                            <hr className="flex-1 border-white/10" />
                        </div>

                        <GoogleLoginButton />

                        <button
                            type="button"
                            onClick={async () => {
                                setGoogleResetKey((k) => k + 1);
                                setError(null);
                                try {
                                    await guestLogin();
                                    window.location.href = "/app";
                                } catch (err) {
                                    const key = mapError(err);
                                    const ns = key.split(".")[0];
                                    const k = key.substring(ns.length + 1);
                                    setError(ns === "common" ? tc(k) : t(k));
                                }
                            }}
                            className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-transparent py-3 text-sm font-semibold text-[#9d9184] transition-colors hover:border-[#f7871f]/40 hover:text-[#f4f1ee]"
                        >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            {t("continueAsGuest")}
                        </button>

                        <p className="pt-2 text-center text-[11px] text-[#a79a8d]">
                            {t("noAccount")}{" "}
                            <Link href="/register" className="font-semibold text-[#f7871f]">
                                {t("createAccount")} ({t("freeTier")})
                            </Link>
                        </p>

                        <p className="mt-5 text-center text-[10px] text-[#8e8175]">
                            {tc("version")} · {tc("license")}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}