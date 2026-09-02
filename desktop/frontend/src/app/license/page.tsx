"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "../../shared/auth";

export default function LicensePage() {
    const tl = useTranslations("license");
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-[#17120f] p-[3px] text-[#f4f1ee]">
            <div className="mx-auto flex min-h-[calc(100vh-6px)] w-full max-w-[1330px] overflow-hidden rounded-[22px] border border-white/10 bg-[#201a15]">
                <main className="flex-1 bg-[#221b16] px-14 py-18 flex flex-col items-center justify-center text-center">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f7871f] shadow-[0_8px_20px_rgba(247,135,31,0.35)] mb-6">
                        <div className="relative h-8 w-6 rounded-[8px] bg-[#fff8f2]">
                            <span className="absolute -bottom-1 -right-1 inline-flex h-3.5 w-3.5 rounded-full border-2 border-[#f7871f] bg-white" />
                        </div>
                    </div>

                    <h1 className="text-[36px] font-bold leading-tight text-white">{tl("title")}</h1>
                    <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[#9d9184]">
                        {tl("currentPlan")} <strong className="text-white">{user?.license_tier || "Free"}</strong>
                    </p>

                    <div className="mt-10 flex items-center gap-3">
                        <Link href="/app" className="rounded-2xl border border-white/15 bg-[#1b1612] px-8 py-3 text-[14px] font-semibold text-white transition hover:bg-[#231c17]">
                            {tl("backToEditor")}
                        </Link>
                        <Link href="/settings" className="rounded-2xl bg-[#f7871f] px-8 py-3 text-[14px] font-semibold text-white shadow-[0_8px_22px_rgba(247,135,31,0.35)] transition hover:bg-[#ff9b37]">
                            {tl("settings")}
                        </Link>
                    </div>
                </main>
            </div>
        </div>
    );
}
