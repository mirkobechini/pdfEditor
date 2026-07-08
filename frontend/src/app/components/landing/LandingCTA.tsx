"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function LandingCTA() {
    const t = useTranslations("landing.cta");

    return (
        <section className="py-20 px-4">
            <div className="max-w-3xl mx-auto text-center">
                <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-12 relative overflow-hidden">
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

                    {/* Content */}
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 relative z-10">
                        {t("title")}
                    </h2>
                    <p className="text-lg text-blue-200 mb-8 relative z-10">
                        {t("description")}
                    </p>
                    <Link
                        href="/register"
                        className="inline-flex px-8 py-3.5 rounded-xl bg-white text-blue-600 font-semibold text-base hover:bg-blue-50 transition-colors shadow-xl relative z-10"
                    >
                        {t("cta")}
                    </Link>
                </div>
            </div>
        </section>
    );
}
