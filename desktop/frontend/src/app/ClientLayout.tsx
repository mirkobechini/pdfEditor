"use client";

import React, { useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "../shared/auth";
import { I18nProvider } from "../lib/i18n";
import { PreferencesProvider } from "../lib/preferences";
import { startKeepWarm } from "../shared/api";
import { openDevTools } from "../shared/tauri";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        startKeepWarm();
        // Ctrl+Shift+D opens devtools (debugging cloud sync / console errors)
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
                e.preventDefault();
                openDevTools();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const content = (
        <PreferencesProvider>
            <I18nProvider>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </I18nProvider>
        </PreferencesProvider>
    );
    if (!GOOGLE_CLIENT_ID) return content;
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            {content}
        </GoogleOAuthProvider>
    );
}