"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../../shared/auth";

export default function ProfilePage() {
    const { user, loading, logout } = useAuth();

    if (loading) {
        return <div className="h-screen bg-[#17120f] flex items-center justify-center text-[#9d9184]">Caricamento...</div>;
    }

    if (!user) {
        return (
            <div className="h-screen bg-[#17120f] flex flex-col items-center justify-center gap-4 text-[#9d9184]">
                <p className="text-sm">Utente non autenticato</p>
                <Link href="/login" className="rounded-xl bg-[#f7871f] px-6 py-2 text-sm font-semibold text-white">
                    Login
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#17120f] p-[3px] text-[#f4f1ee]">
            <div className="mx-auto min-h-[calc(100vh-6px)] w-full max-w-[800px] rounded-[22px] border border-white/10 bg-[#201a15] p-10">
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
                        <span className="text-sm text-[#9d9184]">Piano</span>
                        <span className="text-sm font-semibold text-white capitalize">{user.license_tier}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                        <span className="text-sm text-[#9d9184]">Tipo account</span>
                        <span className="text-sm font-semibold text-white">{user.is_guest ? "Ospite" : "Registrato"}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-[#9d9184]">Stato</span>
                        <span className={`text-sm font-semibold ${user.is_active ? "text-[#3ec35f]" : "text-red-400"}`}>
                            {user.is_active ? "Attivo" : "Inattivo"}
                        </span>
                    </div>
                </div>

                <div className="mt-8 flex items-center gap-3">
                    <Link href="/settings" className="rounded-xl border border-white/10 bg-[#2a231d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2f2822] transition-colors">
                        Impostazioni
                    </Link>
                    <Link href="/app" className="rounded-xl border border-white/10 bg-[#2a231d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2f2822] transition-colors">
                        Editor
                    </Link>
                    <button onClick={() => logout()} className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/20 transition-colors cursor-pointer ml-auto">
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}