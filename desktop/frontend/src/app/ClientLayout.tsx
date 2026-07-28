"use client";

import React from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "../shared/auth";
import { I18nProvider } from "../lib/i18n";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const content = (
        <I18nProvider>
            <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
    );
    if (!GOOGLE_CLIENT_ID) return content;
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            {content}
        </GoogleOAuthProvider>
    );
}