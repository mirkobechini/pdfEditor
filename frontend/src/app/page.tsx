"use client";

import React from "react";
import LandingNavbar from "./components/landing/LandingNavbar";
import LandingHero from "./components/landing/LandingHero";
import LandingFeatures from "./components/landing/LandingFeatures";
import LandingHowItWorks from "./components/landing/LandingHowItWorks";
import LandingCTA from "./components/landing/LandingCTA";
import LandingFooter from "./components/landing/LandingFooter";
import { isTauri } from "./lib/tauri";

export default function Home() {
  const { user, loading } = useAuth();

  React.useEffect(() => {
    // Desktop: always go to login first (unless remember-me is active)
    if (isTauri()) {
      window.location.href = "/login";
      return;
    }
    // Web: if user is authenticated, redirect to editor
    if (!loading && user) {
      window.location.href = "/app";
    }
  }, [loading, user]);

  // Desktop: show nothing while redirecting to /login
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
