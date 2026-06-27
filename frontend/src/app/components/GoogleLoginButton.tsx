"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../lib/auth";

export default function GoogleLoginButton() {
    const t = useTranslations("auth");
    const { googleLogin } = useAuth();
    const [error, setError] = React.useState<string | null>(null);

    async function handleSuccess(response: CredentialResponse) {
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

    // If GoogleOAuthProvider is not available (no GOOGLE_CLIENT_ID), don't render
    try {
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
    } catch {
        // GoogleOAuthProvider not available — render nothing
        return null;
    }
}
