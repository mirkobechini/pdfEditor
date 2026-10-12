"use client";

import React from "react";
import { useSettingsPage } from "../../hooks/useSettingsPage";
import SettingsTabs from "./components/SettingsTabs";
import SettingsModals from "./components/SettingsModals";
import SettingsSidebar from "./components/SettingsSidebar";
import CloudDeletionDialog from "../../components/CloudDeletionDialog";

export default function SettingsPage() {
    const s = useSettingsPage();

    return (
        <div className="min-h-screen bg-[#17120f] p-[3px] text-[#f4f1ee]">
            <div className="mx-auto flex min-h-[calc(100vh-6px)] w-full max-w-[1330px] overflow-hidden rounded-[22px] border border-white/10 bg-[#201a15]">
                <SettingsSidebar s={s} />

                <main className="flex-1 bg-[#221b16] px-9 py-8 overflow-y-auto">
                    <SettingsTabs s={s} />
                </main>
            </div>

            <SettingsModals s={s} />

            {/* Dialog eliminazioni cloud: mostrata dove gira il sync (anche da Settings) */}
            <CloudDeletionDialog
                deletion={s.pendingCloudDeletions?.[0] ?? null}
                onResolve={s.resolveCloudDeletion}
            />
        </div>
    );
}