"use client";

import React from "react";

/**
 * Desktop root page — immediately redirects to /login.
 * No landing page, no auth check, just redirect.
 */
export default function Home() {
    React.useEffect(() => {
        window.location.href = "/login";
    }, []);

    return <div className="h-screen bg-white dark:bg-gray-950" />;
}