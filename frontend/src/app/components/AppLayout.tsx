"use client";

import React from "react";

interface LayoutProps {
  sidebar: React.ReactNode;
  toolbar: React.ReactNode;
  viewer: React.ReactNode;
}

export default function AppLayout({ sidebar, toolbar, viewer }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

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
          <ToggleDarkMode />
          <LanguageSelector />
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
          <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-950 overflow-auto p-2 md:p-4">
            {viewer}
          </div>
        </main>
      </div>
    </div>
  );
}

function ToggleDarkMode() {
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
      title="Toggle dark mode"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}

function LanguageSelector() {
  const [lang, setLang] = React.useState("it");
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      className="text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
    >
      <option value="it">IT</option>
      <option value="en">EN</option>
    </select>
  );
}