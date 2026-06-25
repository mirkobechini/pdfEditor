"use client";

import React from "react";
import { I18nProvider } from "./lib/i18n";
import { AuthProvider } from "./lib/auth";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>{children}</AuthProvider>
    </I18nProvider>
  );
}