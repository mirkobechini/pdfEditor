"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "../lib/auth";

export default function GuestConvertBanner() {
    const t = useTranslations("auth");
    const { user } = useAuth();

    if (!user?.is_guest) return null;

    return (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    {t("guestConvertDescription")}
                </p>
                <Link
                    href="/register?convert=1"
                    className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded font-medium transition-colors shrink-0"
                >
                    {t("guestConvertTitle")}
                </Link>
            </div>
        </div>
    );
}