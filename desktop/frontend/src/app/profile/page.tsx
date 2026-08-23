"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "../../shared/auth";
import { api } from "../../shared/api";

export default function ProfilePage() {
    const tp = useTranslations("profile");
    const { user, loading, logout, setUser } = useAuth();
    const [showUnlinkModal, setShowUnlinkModal] = React.useState(false);
    const [unlinkPassword, setUnlinkPassword] = React.useState("");
    const [unlinking, setUnlinking] = React.useState(false);
    const [unlinkError, setUnlinkError] = React.useState<string | null>(null);

    const handleUnlinkGoogle = async () => {
        if (!unlinkPassword) return;
        setUnlinking(true);
        setUnlinkError(null);
        try {
            const updated = await api.unlinkGoogle(unlinkPassword);
            setUser({ ...user!, ...updated });
            setShowUnlinkModal(false);
            setUnlinkPassword("");
        } catch (err) {
            setUnlinkError(err instanceof Error ? err.message : "Failed to unlink");
        } finally {
            setUnlinking(false);
        }
    };

    if (loading) {
        return <div className="h-screen bg-[#17120f] flex items-center justify-center text-[#9d9184]">{tp("loading")}</div>;
    }

    if (!user) {
        return (
            <div className="h-screen bg-[#17120f] flex flex-col items-center justify-center gap-4 text-[#9d9184]">
                <p className="text-sm">{tp("notAuthenticated")}</p>
                <Link href="/login" className="rounded-xl bg-[#f7871f] px-6 py-2 text-sm font-semibold text-white">
                    {tp("login")}
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#17120f] text-[#f4f1ee]">
            <div className="mx-auto max-w-[800px] px-6 py-10">
                <div className="flex items-center gap-4 mb-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3e2717] text-2xl font-bold text-[#f7871f]">
                        {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{user.full_name}</h1>
                        <p className="text-sm text-[#9d9184]">{user.email}</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#221b16] p-6 space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                        <span className="text-sm text-[#9d9184]">{tp("plan")}</span>
                        <span className="text-sm font-semibold text-white capitalize">{user.license_tier}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                        <span className="text-sm text-[#9d9184]">{tp("accountType")}</span>
                        <span className="text-sm font-semibold text-white">{user.is_guest ? tp("guest") : tp("registered")}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-[#9d9184]">{tp("status")}</span>
                        <span className={`text-sm font-semibold ${user.is_active ? "text-[#3ec35f]" : "text-red-400"}`}>
                            {user.is_active ? tp("active") : tp("inactive")}
                        </span>
                    </div>
                </div>

                {/* Connected Services */}
                <div className="mt-8 rounded-2xl border border-white/10 bg-[#221b16] p-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#918476] mb-4">{tp("connectedServices")}</h3>
                    <div className="flex items-center justify-between p-3 border border-white/10 rounded-xl">
                        <div className="flex items-center gap-3">
                            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.31h6.45a5.52 5.52 0 0 1-2.4 3.63v3.01h3.88c2.27-2.09 3.56-5.16 3.56-8.68z" />
                                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.88-3.01c-1.08.72-2.46 1.15-4.05 1.15-3.11 0-5.74-2.1-6.68-4.92H1.31v3.1A12 12 0 0 0 12 24z" />
                                <path fill="#FBBC05" d="M5.32 14.31A7.2 7.2 0 0 1 4.95 12c0-.8.14-1.57.37-2.31v-3.1H1.31A12 12 0 0 0 0 12c0 1.94.46 3.78 1.31 5.41l4.01-3.1z" />
                                <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.6 4.59 1.77l3.44-3.44C17.95 1.14 15.24 0 12 0 7.31 0 3.27 2.69 1.31 6.59l4.01 3.1C6.26 6.87 8.89 4.77 12 4.77z" />
                            </svg>
                            <div>
                                <p className="font-medium text-white">{tp("google")}</p>
                                <p className="text-sm text-[#9d9184]">{user.google_id ? tp("connected") : tp("notConnected")}</p>
                            </div>
                        </div>
                        {user.google_id ? (
                            <button
                                onClick={() => setShowUnlinkModal(true)}
                                className="px-3 py-1 text-xs rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 font-medium"
                            >
                                {tp("unlink")}
                            </button>
                        ) : (
                            <span className="text-xs text-[#9d9184]">{tp("notAvailable")}</span>
                        )}
                    </div>
                </div>

                {/* Unlink Confirmation Modal */}
                {showUnlinkModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="bg-[#221b16] border border-white/10 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
                            <h3 className="text-lg font-bold mb-2 text-white">{tp("unlinkGoogle")}</h3>
                            <p className="text-sm text-[#9d9184] mb-4">{tp("unlinkGoogleDesc")}</p>
                            <input
                                type="password"
                                placeholder={tp("password")}
                                value={unlinkPassword}
                                onChange={(e) => setUnlinkPassword(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#17120f] text-white mb-3"
                            />
                            {unlinkError && (
                                <p className="text-sm text-red-400 mb-3">{unlinkError}</p>
                            )}
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => { setShowUnlinkModal(false); setUnlinkPassword(""); setUnlinkError(null); }}
                                    className="px-4 py-2 text-sm rounded-xl border border-white/10 bg-[#2a231d] text-white hover:bg-[#2f2822]"
                                >
                                    {tp("cancel")}
                                </button>
                                <button
                                    onClick={handleUnlinkGoogle}
                                    disabled={unlinking || !unlinkPassword}
                                    className="px-4 py-2 text-sm rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-50 font-medium"
                                >
                                    {unlinking ? tp("unlinking") : tp("confirm")}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-8 flex items-center gap-3">
                    <Link href="/settings" className="rounded-xl border border-white/10 bg-[#2a231d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2f2822] transition-colors">
                        {tp("settings")}
                    </Link>
                    <Link href="/app" className="rounded-xl border border-white/10 bg-[#2a231d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2f2822] transition-colors">
                        {tp("editor")}
                    </Link>
                    <button onClick={() => logout()} className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/20 transition-colors cursor-pointer ml-auto">
                        {tp("logout")}
                    </button>
                </div>
            </div>
        </div>
    );
}