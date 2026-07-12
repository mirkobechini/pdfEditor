"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function LandingFooter() {
    const t = useTranslations("landing.footer");

    return (
        <footer className="border-t border-gray-200 dark:border-gray-800 py-12 px-4">
            <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
                {/* Brand column */}
                <div className="col-span-2 md:col-span-1">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                            P
                        </div>
                        <span className="font-bold text-gray-900 dark:text-gray-100">PdfEditor</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        {t("brand")}
                    </p>
                </div>

                {/* Product column */}
                <div>
                    <h4 className="text-sm font-semibold mb-4 text-gray-900 dark:text-gray-100">
                        {t("product.title")}
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                        <li>
                            <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                {t("product.features")}
                            </a>
                        </li>
                        <li>
                            <a href="#pricing" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                {t("product.pricing")}
                            </a>
                        </li>
                        <li>
                            <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                {t("product.api")}
                            </a>
                        </li>
                        <li>
                            <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                {t("product.roadmap")}
                            </a>
                        </li>
                    </ul>
                </div>

                {/* Resources column */}
                <div>
                    <h4 className="text-sm font-semibold mb-4 text-gray-900 dark:text-gray-100">
                        {t("resources.title")}
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                        <li>
                            <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                {t("resources.docs")}
                            </a>
                        </li>
                        <li>
                            <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                {t("resources.guide")}
                            </a>
                        </li>
                        <li>
                            <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                {t("resources.faq")}
                            </a>
                        </li>
                        <li>
                            <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                {t("resources.status")}
                            </a>
                        </li>
                    </ul>
                </div>

                {/* Legal column */}
                <div>
                    <h4 className="text-sm font-semibold mb-4 text-gray-900 dark:text-gray-100">
                        {t("legal.title")}
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                        <li>
                            <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                {t("legal.privacy")}
                            </Link>
                        </li>
                        <li>
                            <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                {t("legal.terms")}
                            </a>
                        </li>
                        <li>
                            <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                {t("legal.cookies")}
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Copyright */}
            <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-center text-xs text-gray-400 dark:text-gray-600">
                &copy; 2026 PdfEditor. {t("copyright")}
            </div>
        </footer>
    );
}
