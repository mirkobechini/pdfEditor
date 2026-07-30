"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function StartupPage() {
    const router = useRouter();

    // Redirect immediately — login page handles backend readiness with a warning
    React.useEffect(() => {
        const wizardDone = localStorage.getItem("pdfeditor_wizard_done");
        router.replace(wizardDone === "true" ? "/login" : "/wizard");
    }, [router]);

    return (
        <div className="h-screen bg-[#17120f] font-sans text-[#f4f1ee] transition-colors flex items-center justify-center">
            <div className="w-full max-w-md px-6 text-center">
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#f7871f] shadow-[0_8px_20px_rgba(247,135,31,0.35)] mx-auto block">
                    <div className="h-8 w-6 rounded-[8px] bg-[#fff8f2]" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">PdfEditor</h1>
                <p className="text-[14px] text-[#9d9184]">Avvio in corso...</p>
                <div className="mt-10 text-center">
                    <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#f7871f] border-t-transparent" />
                </div>
                <p className="mt-10 text-center text-[10px] text-[#8e8175]">
                    v0.1.25 · AGPL-3.0
                </p>
            </div>
        </div>
    );
}