"use client";

import React from "react";
import { I18nProvider } from "./lib/i18n";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}