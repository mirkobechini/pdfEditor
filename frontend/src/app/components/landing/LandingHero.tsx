"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function LandingHero() {
  const t = useTranslations("landing.hero");

  return (
    <section className="pt-32 pb-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6 border border-blue-200 dark:border-blue-800">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          {t("badge")}
        </div>

        {/* Heading */}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight text-gray-900 dark:text-gray-100">
          {t("title")}
          <br />
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            {t("subtitle")}
          </span>
        </h1>

        {/* Description */}
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          {t("description")}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/register"
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-base hover:opacity-90 transition-opacity shadow-xl shadow-blue-500/25"
          >
            {t("ctaPrimary")}
          </Link>
          <a
            href="#features"
            className="px-8 py-3.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-base hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {t("ctaSecondary")}
          </a>
        </div>

        {/* Screenshot Mockup */}
        <div className="relative mx-auto max-w-3xl rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden bg-white dark:bg-gray-900">
          {/* Browser chrome */}
          <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span className="ml-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
              PdfEditor — {t("mockupTitle")}
            </span>
          </div>

          {/* Content area */}
          <div className="aspect-[16/9] bg-gray-50 dark:bg-gray-800 flex items-center justify-center p-6">
            <div className="w-full h-full rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <svg
                  className="w-12 h-12 mx-auto mb-3 opacity-50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                <p className="text-sm">{t("mockupText")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
