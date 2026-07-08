"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import HeaderControls from "../HeaderControls";

export default function LandingNavbar() {
    const t = useTranslations("landing.navbar");
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                        P
                    </div>
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">PdfEditor</span>
                </Link>

                {/* Nav links — desktop only */}
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-400">
                    <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        {t("features")}
                    </a>
                    <a href="#how-it-works" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        {t("howItWorks")}
                    </a>
                    <a href="#pricing" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        {t("pricing")}
                    </a>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex">
                        <HeaderControls />
                    </div>
                    <Link
                        href="/login"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                        {t("login")}
                    </Link>
                    <Link
                        href="/register"
                        className="text-sm font-medium px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20"
                    >
                        {t("register")}
                    </Link>
                </div>
            </div>
        </nav>
    );
}
