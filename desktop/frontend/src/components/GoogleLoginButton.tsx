"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface GoogleLoginButtonProps {
    resetKey?: number;
}

export default function GoogleLoginButton({ resetKey }: GoogleLoginButtonProps) {
    const t = useTranslations("auth");
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        setError(null);
    }, [resetKey]);

    return (
        <div className="mb-4">
            <button
                type="button"
                onClick={() => setError("Google login verrà collegato nel prossimo step backend+OAuth")}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-transparent py-3 text-sm font-semibold text-[#f4f1ee] transition-colors hover:bg-white/5"
            >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.31h6.45a5.52 5.52 0 0 1-2.4 3.63v3.01h3.88c2.27-2.09 3.56-5.16 3.56-8.68z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.88-3.01c-1.08.72-2.46 1.15-4.05 1.15-3.11 0-5.74-2.1-6.68-4.92H1.31v3.1A12 12 0 0 0 12 24z" />
                    <path fill="#FBBC05" d="M5.32 14.31A7.2 7.2 0 0 1 4.95 12c0-.8.14-1.57.37-2.31v-3.1H1.31A12 12 0 0 0 0 12c0 1.94.46 3.78 1.31 5.41l4.01-3.1z" />
                    <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.6 4.59 1.77l3.44-3.44C17.95 1.14 15.24 0 12 0 7.31 0 3.27 2.69 1.31 6.59l4.01 3.1C6.26 6.87 8.89 4.77 12 4.77z" />
                </svg>
                {t("continueWithGoogle")}
            </button>
            {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        </div>
    );
}