"use client";

import React from "react";
import Link from "next/link";
import type { SettingsPageState } from "../../../hooks/useSettingsPage";
import { SECTION_LIST } from "../../../hooks/useSettingsPage";

/**
 * Left navigation rail of the SettingsPage (issue #885, A3c - step 2).
 * Extracted from settings/page.tsx to keep the page a thin renderer.
 */
export default function SettingsSidebar({ s }: { s: SettingsPageState }) {
    return (
        <aside className="w-[250px] shrink-0 border-r border-white/10 bg-[#1f1914] px-5 py-6">
            <Link href="/app" className="flex items-center gap-2 rounded-[14px] border border-white/10 bg-[#2a231d] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#2f2822] transition cursor-pointer mb-6">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                </svg>
                {s.ts("backToEditor")}
            </Link>
            <div className="space-y-1">
                {SECTION_LIST.map((item) => {
                    return (
                        <button
                            key={item.id}
                            onClick={() => s.setActiveTab(item.id)}
                            className={`w-full rounded-[14px] px-4 py-2.5 text-left text-[13px] transition cursor-pointer ${s.activeTab === item.id
                                ? "border border-white/10 bg-[#241d17] font-semibold text-white"
                                : "border border-transparent text-[#9d9184] hover:text-white"
                                }`}
                        >
                            {s.ts(item.label)}
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}