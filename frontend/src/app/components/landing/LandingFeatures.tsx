"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface Feature {
  id: string;
  icon: string;
  titleKey: string;
  descriptionKey: string;
  bgColor: string;
  iconColor: string;
}

export default function LandingFeatures() {
  const t = useTranslations("landing.features");

  const features: Feature[] = [
    {
      id: "merge",
      icon: "🔗",
      titleKey: "merge.title",
      descriptionKey: "merge.description",
      bgColor: "bg-blue-100 dark:bg-blue-900/40",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      id: "split",
      icon: "✂️",
      titleKey: "split.title",
      descriptionKey: "split.description",
      bgColor: "bg-purple-100 dark:bg-purple-900/40",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      id: "reorder",
      icon: "🔄",
      titleKey: "reorder.title",
      descriptionKey: "reorder.description",
      bgColor: "bg-green-100 dark:bg-green-900/40",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      id: "edittext",
      icon: "📝",
      titleKey: "edittext.title",
      descriptionKey: "edittext.description",
      bgColor: "bg-amber-100 dark:bg-amber-900/40",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      id: "unlock",
      icon: "🔓",
      titleKey: "unlock.title",
      descriptionKey: "unlock.description",
      bgColor: "bg-rose-100 dark:bg-rose-900/40",
      iconColor: "text-rose-600 dark:text-rose-400",
    },
    {
      id: "metadata",
      icon: "📄",
      titleKey: "metadata.title",
      descriptionKey: "metadata.description",
      bgColor: "bg-cyan-100 dark:bg-cyan-900/40",
      iconColor: "text-cyan-600 dark:text-cyan-400",
    },
  ];

  return (
    <section id="features" className="py-20 px-4 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            {t("title")}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            {t("description")}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 transition-transform duration-200 hover:translate-y-[-4px] hover:shadow-xl hover:shadow-blue-500/15 dark:hover:shadow-blue-500/8"
            >
              <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center text-2xl mb-4`}>
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                {t(`${feature.id}.${feature.titleKey.split(".")[1]}`)}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {t(`${feature.id}.${feature.descriptionKey.split(".")[1]}`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
