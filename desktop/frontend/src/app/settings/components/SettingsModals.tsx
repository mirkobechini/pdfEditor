"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import type { SettingsPageState } from "../../../hooks/useSettingsPage";

function CloseIcon({ onClick }: { onClick: () => void }) {
    return (
        <button onClick={onClick} className="h-8 w-8 rounded-lg text-[#9a8d80] hover:bg-white/10 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
    );
}

/**
 * All the overlay modals of the SettingsPage — changelog, bug report and
 * documentation (issue #885, A3c - step 2). Extracted from settings/page.tsx
 * so the page stays thin. Reads state/handlers from `s`.
 */
export default function SettingsModals({ s }: { s: SettingsPageState }) {
    const ts = useTranslations("settings");
    const t = useTranslations("common");

    const changelogBody = useMemo(() => {
        if (s.changelogData === null) {
            return <p className="text-sm text-[#9a8d80]">Caricamento in corso...</p>;
        }
        if (s.changelogData.length === 0) {
            return <p className="text-sm text-[#9a8d80]">Changelog non disponibile.</p>;
        }
        return s.changelogData.map((entry) => (
            <div key={entry.version} className="rounded-xl border border-white/10 bg-[#1f1914] p-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#3e2717] text-[#f7871f] font-medium">{entry.version}</span>
                    <span className="text-xs text-[#7e7267]">{entry.date}</span>
                </div>
                <ul className="space-y-1">
                    {entry.changes.map((change, i) => (
                        <li key={i} className="text-sm text-[#c4b8ab]">{change}</li>
                    ))}
                </ul>
            </div>
        ));
    }, [s.changelogData]);

    return (
        <>
            {/* Changelog modal */}
            {s.changelogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-2xl max-h-[80vh] rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-white">{ts("releaseNotes")}</h2>
                            <CloseIcon onClick={() => s.setChangelogOpen(false)} />
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4">
                            {changelogBody}
                        </div>
                        <button onClick={() => s.setChangelogOpen(false)} className="mt-4 self-end rounded-xl bg-[#f7871f] px-5 py-2 text-sm font-semibold text-white">Chiudi</button>
                    </div>
                </div>
            )}

            {/* Bug report modal */}
            {s.bugReportOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-white">{s.bugDone ? ts("bugThankYou") : ts("reportBug")}</h2>
                            <CloseIcon onClick={s.closeBugReport} />
                        </div>
                        {s.bugDone ? (
                            <div>
                                <p className="text-sm text-[#48c769] mb-6">Segnalazione inviata con successo. Grazie per il contributo!</p>
                                <button onClick={s.closeBugReport} className="w-full rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white">Chiudi</button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <input value={s.bugTitle} onChange={(e) => s.setBugTitle(e.target.value)} placeholder={ts("bugTitlePlaceholder")} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none focus:border-[#f7871f]/50" />
                                <textarea value={s.bugDesc} onChange={(e) => s.setBugDesc(e.target.value)} placeholder={ts("bugDescPlaceholder")} rows={5} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none focus:border-[#f7871f]/50 resize-none" />
                                {s.bugError && <p className="text-xs text-red-400">{s.bugError}</p>}
                                <div className="flex gap-3">
                                    <button onClick={s.closeBugReport} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[#9a8d80] hover:bg-white/5">Annulla</button>
                                    <button onClick={s.submitBugReport} disabled={s.bugSending} className="flex-1 rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                                        {s.bugSending ? ts("bugSending") : ts("bugSend")}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Documentation modal */}
            {s.docsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-white">{ts("documentation")}</h2>
                            <CloseIcon onClick={() => s.setDocsOpen(false)} />
                        </div>
                        <div className="space-y-4 text-sm text-[#c4b8ab]">
                            <p>La documentazione completa di PdfEditor è disponibile su GitHub.</p>
                            <div className="flex gap-3">
                                <button onClick={() => s.openUrl("https://github.com/mirkobechini/pdfEditor")} className="flex-1 rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white">Apri su GitHub</button>
                                <button onClick={() => s.setDocsOpen(false)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[#9a8d80] hover:bg-white/5">Chiudi</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}