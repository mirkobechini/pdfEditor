"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function PrivacyPage() {
    const t = useTranslations("privacy");

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {/* Header */}
            <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
                <Link href="/landing" className="flex items-center gap-2 hover:opacity-75">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold">P</div>
                    <span className="font-bold">PdfEditor</span>
                </Link>
            </header>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold mb-8">{t("title")}</h1>
                <div className="prose dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    <p><strong>{t("lastUpdated")}</strong></p>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900 dark:text-gray-100">{t("infoWeCollect.title")}</h2>
                        <p>{t("infoWeCollect.description")}</p>
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                            <li>{t("infoWeCollect.item1")}</li>
                            <li>{t("infoWeCollect.item2")}</li>
                            <li>{t("infoWeCollect.item3")}</li>
                            <li>{t("infoWeCollect.item4")}</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900 dark:text-gray-100">{t("howWeUse.title")}</h2>
                        <p>{t("howWeUse.description")}</p>
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                            <li>{t("howWeUse.item1")}</li>
                            <li>{t("howWeUse.item2")}</li>
                            <li>{t("howWeUse.item3")}</li>
                            <li>{t("howWeUse.item4")}</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900 dark:text-gray-100">{t("dataSharing.title")}</h2>
                        <p>{t("dataSharing.description")}</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900 dark:text-gray-100">{t("dataSecurity.title")}</h2>
                        <p>{t("dataSecurity.description")}</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900 dark:text-gray-100">{t("contact.title")}</h2>
                        <p>{t("contact.description")}</p>
                    </section>
                </div>
            </div>
        </div>
    );
}