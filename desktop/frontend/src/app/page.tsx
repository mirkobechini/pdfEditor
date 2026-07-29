"use client";

import React from "react";

const WIZARD_DONE_KEY = "pdfeditor_wizard_done";

/**
 * Desktop root page — checks first-launch status.
 * First time → /wizard, afterwards → /login.
 */
export default function Home() {
    React.useEffect(() => {
        const wizardDone = localStorage.getItem(WIZARD_DONE_KEY);
        if (wizardDone === "true") {
            window.location.href = "/login";
        } else {
            window.location.href = "/wizard";
        }
    }, []);

    return <div className="h-screen bg-white dark:bg-gray-950" />;
}