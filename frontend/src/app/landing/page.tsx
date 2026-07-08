"use client";

import React from "react";
import LandingNavbar from "../components/landing/LandingNavbar";
import LandingHero from "../components/landing/LandingHero";
import LandingFeatures from "../components/landing/LandingFeatures";
import LandingHowItWorks from "../components/landing/LandingHowItWorks";
import LandingPricing from "../components/landing/LandingPricing";
import LandingCTA from "../components/landing/LandingCTA";
import LandingFooter from "../components/landing/LandingFooter";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
            <LandingNavbar />
            <main className="pt-16">
                <LandingHero />
                <LandingFeatures />
                <LandingHowItWorks />
                <LandingPricing />
                <LandingCTA />
            </main>
            <LandingFooter />
        </div>
    );
}
