"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "../lib/auth";
import { mapError } from "../lib/error-map";

export default function GoogleLoginButton() {
    const t = useTranslations("auth");
    const { googleLogin } = useAuth();
    const [error, setError] = React.useState<string | null>(null);
    const [mounted, setMounted] = React.useState(false);
    const [GoogleLogin, setGoogleLogin] = React.useState<React.ComponentType<any> | null>(null);

    React.useEffect(() => {
        // Only run on client side
        setMounted(true);
        (async () => {
            try {
                const hasClientId = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
                if (hasClientId) {
                    const mod = await import("@react-oauth/google");
                    setGoogleLogin(() => mod.GoogleLogin);
                }
            } catch (err) {
                console.debug("Google OAuth not available:", err);
            }
        })();
    }, []);

    if (!mounted || !GoogleLogin) {
        return <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />;
    }

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
            setError(t("loginFailed") + ": " + mapError(err));
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
