"use client";

import React, { useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "../shared/auth";
import { I18nProvider } from "../lib/i18n";
import { PreferencesProvider } from "../lib/preferences";
import { startKeepWarm } from "../shared/api";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        startKeepWarm();
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