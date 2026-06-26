"use client";

import React from "react";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../lib/auth";
import BugReportDialog from "./BugReportDialog";
import HeaderControls from "./HeaderControls";

interface LayoutProps {
  sidebar: React.ReactNode;
  toolbar: React.ReactNode;
  viewer: React.ReactNode;
}

export default function AppLayout({ sidebar, toolbar, viewer }: LayoutProps) {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [bugReportOpen, setBugReportOpen] = React.useState(false);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          {/* Hamburger — visible only on mobile */}
          <button
            className="md:hidden p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-lg"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle sidebar"
          >
            {sidebarOpen ? "✕" : "☰"}
          </button>
          <h1 className="text-lg font-bold">PdfEditor</h1>
        </div>
        <div className="flex items-center gap-3">
          <HeaderControls />
          <button
            className="px-3 py-1 text-xs rounded bg-orange-500 text-white hover:bg-orange-600"
            onClick={() => setBugReportOpen(true)}
            title={t("bugReport.button")}
          >
            {t("bugReport.button")}
          </button>
          {user && (
            <>
              <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
                {user.full_name}
              </span>
              <button
                className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                onClick={() => { logout(); window.location.href = "/login"; }}
                title={t("auth.logout")}
              >
                {t("auth.logout")}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Overlay — mobile only, closes sidebar on tap */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/30 z-10"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — hidden on mobile unless toggled */}
        <aside
          className={`
            w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
            flex flex-col shrink-0 overflow-y-auto
            fixed md:static inset-y-14 left-0 z-20
            transition-transform duration-200
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
        >
          {sidebar}
        </aside>

        {/* Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar — scrollable on mobile */}
          <div className="h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-3 shrink-0 overflow-x-auto whitespace-nowrap">
            {toolbar}
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 bg-gray-100 dark:bg-gray-950 overflow-auto p-2 md:p-4">
            {viewer}
          </div>
        </main>
      </div>
      <BugReportDialog open={bugReportOpen} onClose={() => setBugReportOpen(false)} />
    </div>
  );
}