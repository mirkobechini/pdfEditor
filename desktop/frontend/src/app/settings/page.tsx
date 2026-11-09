"use client";

import React from "react";
import { useSettingsPage } from "../../hooks/useSettingsPage";
import SettingsTabs from "./components/SettingsTabs";
import SettingsModals from "./components/SettingsModals";
import SettingsSidebar from "./components/SettingsSidebar";
import CloudDeletionDialog from "../../components/CloudDeletionDialog";

export default function SettingsPage() {
    const s = useSettingsPage();

    // 09/11 (Mirko): SOLO il contenuto delle impostazioni deve scrollare. Prima la
    // pagina cresceva col contenuto (min-h) e lo scroll prendeva anche la sidebar;
    // con h-screen + overflow-hidden il contenitore è vincolato al viewport e
    // `main` scrolla al suo interno.
    return (
        <div className="h-screen overflow-hidden bg-[#17120f] p-[3px] text-[#f4f1ee]">
            <div className="mx-auto flex h-[calc(100vh-6px)] w-full max-w-[1330px] overflow-hidden rounded-[22px] border border-white/10 bg-[#201a15]">
                <SettingsSidebar s={s} />

                <main className="min-h-0 flex-1 overflow-y-auto bg-[#221b16] px-9 py-8">
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