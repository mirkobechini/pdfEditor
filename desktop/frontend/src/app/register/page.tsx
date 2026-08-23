"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "../../shared/auth";
import { mapError } from "../../shared/error-map";
import PasswordInput from "../../components/PasswordInput";

export default function RegisterPage() {
    const t = useTranslations("auth");
    const tc = useTranslations("common");
    const tr = useTranslations("register");
    const router = useRouter();
    const { register, user, loading: authLoading } = useAuth();
    const [fullName, setFullName] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (!authLoading && user) {
            router.push("/app");
        }
    }, [authLoading, user, router]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!fullName.trim() || !email.trim() || !password.trim()) return;

        if (password !== confirmPassword) {
            setError(t("passwordMismatch"));
            return;
        }

        if (password.length < 6) {
            setError(t("passwordTooShort"));
            return;
        }

        setSubmitting(true);
        try {
            await register(email.trim(), password, fullName.trim());
            router.push("/app");
        } catch (err) {
            const key = mapError(err);
            const ns = key.split(".")[0];
            const k = key.substring(ns.length + 1);
            setError((ns === "common" ? tc(k) : t(k)) || t("registerFailed"));
        } finally {
            setSubmitting(false);
        }
    }

    if (user) {
        return <div className="h-screen bg-[#17120f]" />;
    }

    return (
        <div className="min-h-screen bg-[#17120f] font-sans text-[#f4f1ee] flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#f7871f] shadow-[0_8px_20px_rgba(247,135,31,0.35)] mx-auto block">
                    <div className="h-8 w-6 rounded-[8px] bg-[#fff8f2]" />
                </div>

                <h1 className="text-center text-[22px] font-bold text-white mb-1">{t("registerTitle")}</h1>
                <p className="text-center text-[12px] text-[#a79a8d] mb-8">
                    {t("noAccount")}{" "}
                    <Link href="/login" className="font-semibold text-[#f7871f]">{t("loginButton")}</Link>
                </p>

                {error && (
                    <div className="mb-4 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#a79a8d]">{t("fullName")}</label>
                        <input
                            id="name"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder={tr("namePlaceholder")}
                            required
                            autoFocus
                            className="h-11 w-full rounded-xl border border-white/10 bg-transparent px-4 text-sm font-medium text-[#f4f1ee] outline-none transition focus:border-[#f7871f]"
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#a79a8d]">{t("email")}</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={tr("emailPlaceholder")}
                            required
                            className="h-11 w-full rounded-xl border border-white/10 bg-transparent px-4 text-sm font-medium text-[#f4f1ee] outline-none transition focus:border-[#f7871f]"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#a79a8d]">{t("password")}</label>
                        <PasswordInput value={password} onChange={setPassword} placeholder={tr("passwordPlaceholder")} required />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#a79a8d]">{t("confirmPassword")}</label>
                        <PasswordInput id="confirmPassword" value={confirmPassword} onChange={setConfirmPassword} placeholder={tr("confirmPasswordPlaceholder")} required />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || !fullName.trim() || !email.trim() || !password.trim()}
                        className="w-full cursor-pointer rounded-xl bg-[#f7871f] py-3 text-sm font-semibold text-white shadow-sm shadow-[#f7871f]/30 transition-colors hover:bg-[#ce5a00] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting ? tc("loading") : t("registerButton")}
                    </button>
                </form>

                <p className="mt-6 text-center text-[10px] text-[#8e8175]">{tc("version")} · {tc("license")}</p>
            </div>
        </div>
    );
}