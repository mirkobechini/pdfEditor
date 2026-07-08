"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface Step {
    number: number;
    titleKey: string;
    descriptionKey: string;
}

export default function LandingHowItWorks() {
    const t = useTranslations("landing.howItWorks");

    const steps: Step[] = [
        {
            number: 1,
            titleKey: "step1.title",
            descriptionKey: "step1.description",
        },
        {
            number: 2,
            titleKey: "step2.title",
            descriptionKey: "step2.description",
        },
        {
            number: 3,
            titleKey: "step3.title",
            descriptionKey: "step3.description",
        },
    ];

    return (
        <section id="how-it-works" className="py-20 px-4">
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

                {/* Steps Grid */}
                <div className="grid md:grid-cols-3 gap-8 relative">
                    {/* Connector line (desktop only) */}
                    <div className="hidden md:block absolute top-12 left-[calc(16.66%+24px)] right-[calc(16.66%+24px)] h-0.5 bg-gradient-to-r from-blue-400 to-purple-400"></div>

                    {steps.map((step) => (
                        <div key={step.number} className="text-center relative">
                            {/* Step circle */}
                            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-500/20 relative z-10">
                                {step.number}
                            </div>

                            {/* Step content */}
                            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                                {t(step.titleKey)}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                {t(step.descriptionKey)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
