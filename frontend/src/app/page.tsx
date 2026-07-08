"use client";

import React from "react";
import LandingNavbar from "./components/landing/LandingNavbar";
import LandingHero from "./components/landing/LandingHero";
import LandingFeatures from "./components/landing/LandingFeatures";
import LandingHowItWorks from "./components/landing/LandingHowItWorks";
import LandingPricing from "./components/landing/LandingPricing";
import LandingCTA from "./components/landing/LandingCTA";
import LandingFooter from "./components/landing/LandingFooter";
import { useAuth } from "./lib/auth";

export default function Home() {
  const { user, loading } = useAuth();

  React.useEffect(() => {
    // If user is authenticated, redirect to editor
    if (!loading && user) {
      window.location.href = "/app";
    }
  }, [loading, user]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <LandingNavbar logo={{ src: "/orange-monkey_logo.png", alt: "PdfEditor Logo" }} />
      <main className="pt-16">
        <LandingHero />
        <LandingFeatures />
        <LandingHowItWorks />
        {/* <LandingPricing /> */}
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
