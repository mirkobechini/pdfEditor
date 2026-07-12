"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function RoadmapPage() {
    const t = useTranslations("roadmap");

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
                <Link href="/landing" className="flex items-center gap-2 hover:opacity-75">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold">P</div>
                    <span className="font-bold">PdfEditor</span>
                </Link>
            </header>
            <div className="max-w-3xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold mb-8">{t("title")}</h1>
                <div className="space-y-6 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    <p>{t("intro")}</p>
                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900 dark:text-gray-100">1. {t("s1.title")}</h2>
                        <p>{t("s1.content")}</p>
                    </section>
                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900 dark:text-gray-100">2. {t("s2.title")}</h2>
                        <p>{t("s2.content")}</p>
                    </section>
                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900 dark:text-gray-100">3. {t("s3.title")}</h2>
                        <p>{t("s3.content")}</p>
                    </section>
                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900 dark:text-gray-100">4. {t("s4.title")}</h2>
                        <p>{t("s4.content")}</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
