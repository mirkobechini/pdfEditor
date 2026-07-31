"use client";

import React from "react";
import { useAuth } from "../../shared/auth";
import { api } from "../../shared/api";
import { useRouter } from "next/navigation";

export default function GuestConvertBanner() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [open, setOpen] = React.useState(false);
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [fullName, setFullName] = React.useState("");
    const [error, setError] = React.useState("");
    const [loading, setLoading] = React.useState(false);

    if (!user?.is_guest) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await api.convertGuest(email, password, fullName);
            setOpen(false);
            await logout();
            router.push("/login?converted=1");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Errore durante la conversione");
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className="flex items-center gap-3 border-t border-white/8 bg-yellow-900/10 px-5 py-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-600/20 text-yellow-400 text-xs font-bold">!</div>
                <p className="flex-1 text-[12px] text-yellow-300/80">
                    Account temporaneo
                </p>
                <button
                    onClick={() => setOpen(true)}
                    className="rounded-lg bg-yellow-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-yellow-500"
                >
                    Converti
                </button>
            </div>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1f1914] p-6">
                        <h2 className="text-lg font-bold text-white mb-1">Converti in account completo</h2>
                        <p className="text-[13px] text-[#9a8d80] mb-5">
                            Inserisci email e password per salvare i tuoi documenti e accedere da qualsiasi dispositivo.
                        </p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8d8175] mb-1.5">Nome completo</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition focus:border-[#f7871f]/50 focus:bg-white/[0.06]"
                                    placeholder="Mario Rossi"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8d8175] mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition focus:border-[#f7871f]/50 focus:bg-white/[0.06]"
                                    placeholder="mario@esempio.it"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8d8175] mb-1.5">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition focus:border-[#f7871f]/50 focus:bg-white/[0.06]"
                                    placeholder="Almeno 8 caratteri"
                                    minLength={8}
                                    required
                                />
                            </div>
                            {error && (
                                <p className="text-[13px] text-red-400">{error}</p>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white transition hover:bg-[#ce5a00] disabled:opacity-50"
                                >
                                    {loading ? "Conversione in corso..." : "Converti account"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}