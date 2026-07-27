"use client";

import React from "react";
import LandingNavbar from "./components/landing/LandingNavbar";
import LandingHero from "./components/landing/LandingHero";
import LandingFeatures from "./components/landing/LandingFeatures";
import LandingHowItWorks from "./components/landing/LandingHowItWorks";
import LandingCTA from "./components/landing/LandingCTA";
import LandingFooter from "./components/landing/LandingFooter";
import { isTauri } from "./lib/tauri";
import { useAuth } from "./lib/auth";

export default function Home() {
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (loading) return;

    // If user is authenticated (remember-me), go to editor
    if (user) {
      window.location.href = "/app";
      return;
    }

    // Desktop: go to login first
    if (isTauri()) {
      window.location.href = "/login";
      return;
    }
  }, [loading, user]);

  // Desktop: show nothing while loading/redirecting to login
  if (isTauri()) {
    return <div className="h-screen bg-white dark:bg-gray-950" />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <LandingNavbar />
      <main className="pt-16">
        <LandingHero />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
