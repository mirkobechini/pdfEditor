"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "../lib/auth";

// Lazy-load GoogleLogin only in browser with GOOGLE_CLIENT_ID configured
let GoogleLogin: React.ComponentType<any> | null = null;
try {
    const hasClientId =
        typeof window !== "undefined" &&
        (typeof process === "undefined" ||
            !process.env ||
            !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    if (hasClientId) {
        // Dynamic import to avoid crashing in test/SSR
        const mod = require("@react-oauth/google");
        GoogleLogin = mod.GoogleLogin;
    }
} catch {
    // Not available — render nothing
}

export default function GoogleLoginButton() {
    const t = useTranslations("auth");
    const { googleLogin } = useAuth();
    const [error, setError] = React.useState<string | null>(null);

    if (!GoogleLogin) return null;

    async function handleSuccess(response: { credential?: string }) {
        setError(null);
        if (!response.credential) {
            setError("No credential received");
            return;
        }
        try {
            await googleLogin(response.credential);
            window.location.href = "/";
        } catch (err) {
            setError(t("loginFailed") + ": " + (err instanceof Error ? err.message : err));
        }
    }

    return (
        <>
            <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => setError("Google login failed")}
                size="large"
                width="100%"
                theme="outline"
                text="signin_with"
            />
            {error && (
                <div className="mt-2 p-3 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded">
                    {error}
                </div>
            )}
        </>
    );
}
