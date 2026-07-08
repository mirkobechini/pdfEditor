"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface PricingPlan {
    id: string;
    titleKey: string;
    descriptionKey: string;
    priceKey: string;
    price: string;
    period: string;
    featured: boolean;
    featuresKey: string[];
    ctaKey: string;
    ctaHref: string;
}

export default function LandingPricing() {
    const t = useTranslations("landing.pricing");

    const plans: PricingPlan[] = [
        {
            id: "free",
            titleKey: "free.title",
            descriptionKey: "free.description",
            priceKey: "free.price",
            price: "€0",
            period: "",
            featured: false,
            featuresKey: ["free.feature1", "free.feature2", "free.feature3", "free.feature4", "free.feature5"],
            ctaKey: "free.cta",
            ctaHref: "/register",
        },
        {
            id: "premium",
            titleKey: "premium.title",
            descriptionKey: "premium.description",
            priceKey: "premium.price",
            price: "€9",
            period: "/mese",
            featured: true,
            featuresKey: [
                "premium.feature1",
                "premium.feature2",
                "premium.feature3",
                "premium.feature4",
                "premium.feature5",
            ],
            ctaKey: "premium.cta",
            ctaHref: "/register",
        },
        {
            id: "enterprise",
            titleKey: "enterprise.title",
            descriptionKey: "enterprise.description",
            priceKey: "enterprise.price",
            price: "€29",
            period: "/mese",
            featured: false,
            featuresKey: [
                "enterprise.feature1",
                "enterprise.feature2",
                "enterprise.feature3",
                "enterprise.feature4",
                "enterprise.feature5",
            ],
            ctaKey: "enterprise.cta",
            ctaHref: "mailto:info@pdfeditor.app",
        },
    ];

    return (
        <section id="pricing" className="py-20 px-4 bg-gray-50 dark:bg-gray-900/50">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                        {t("title")}
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
                        {t("description")}
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`rounded-2xl p-8 relative transition-all duration-200 ${plan.featured
                                    ? "border-2 border-blue-500 bg-white dark:bg-gray-900 shadow-xl shadow-blue-500/10 scale-105"
                                    : "border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                                }`}
                        >
                            {/* Featured badge */}
                            {plan.featured && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-semibold">
                                    {t("mostPopular")}
                                </div>
                            )}

                            {/* Plan header */}
                            <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-gray-100">
                                {t(plan.titleKey)}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                {t(plan.descriptionKey)}
                            </p>

                            {/* Price */}
                            <p className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
                                {plan.price}
                                {plan.period && <span className="text-base font-normal text-gray-500 dark:text-gray-400">{plan.period}</span>}
                            </p>

                            {/* Features */}
                            <ul className="space-y-3 text-sm mb-8">
                                {plan.featuresKey.map((featureKey, idx) => {
                                    const featureParts = featureKey.split(".");
                                    const isIncluded = !featureParts[featureParts.length - 1].startsWith("no_");
                                    return (
                                        <li
                                            key={idx}
                                            className={`flex items-center gap-2 ${isIncluded
                                                    ? "text-gray-700 dark:text-gray-300"
                                                    : "text-gray-400 dark:text-gray-600"
                                                }`}
                                        >
                                            <span className={isIncluded ? "text-green-500 font-bold" : "text-gray-400"}>
                                                {isIncluded ? "✓" : "✗"}
                                            </span>
                                            {t(featureKey)}
                                        </li>
                                    );
                                })}
                            </ul>

                            {/* CTA Button */}
                            {plan.ctaHref.startsWith("mailto:") ? (
                                <a
                                    href={plan.ctaHref}
                                    className={`block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${plan.featured
                                            ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:opacity-90 shadow-lg shadow-blue-500/20"
                                            : "border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        }`}
                                >
                                    {t(plan.ctaKey)}
                                </a>
                            ) : (
                                <Link
                                    href={plan.ctaHref}
                                    className={`block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${plan.featured
                                            ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:opacity-90 shadow-lg shadow-blue-500/20"
                                            : "border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        }`}
                                >
                                    {t(plan.ctaKey)}
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
