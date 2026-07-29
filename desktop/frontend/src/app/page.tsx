"use client";

import React from "react";

const WIZARD_DONE_KEY = "pdfeditor_wizard_done";

/**
 * Desktop root page — shows startup screen with backend init status,
 * then redirects to /wizard (first launch) or /login.
 */
export default function Home() {
    React.useEffect(() => {
        window.location.href = "/startup";
    }, []);

    return <div className="h-screen bg-white dark:bg-gray-950" />;
}