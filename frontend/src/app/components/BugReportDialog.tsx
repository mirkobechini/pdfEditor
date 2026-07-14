"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api, BugReport } from "../lib/api";

const BUG_CATEGORIES = [
  "UI",
  "PDF Processing",
  "Auth / Login",
  "Upload / Download",
  "Dark Mode",
  "Other",
] as const;

interface BugReportDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function BugReportDialog({ open, onClose }: BugReportDialogProps) {
  const t = useTranslations("bugReport");
  const [step, setStep] = React.useState<"search" | "create" | "done">("search");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>("");
  const [results, setResults] = React.useState<BugReport[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setStep("search");
      setSearchQuery("");
      setCategory("");
      setResults([]);
      setTitle("");
      setDescription("");
      setSending(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await api.searchBugReports(searchQuery.trim());
      setResults(res);
    } catch (err) {
      setError(t("searchFailed") + ": " + (err instanceof Error ? err.message : err));
    } finally {
      setSearching(false);
    }
  }

  async function handleVote(bugId: string) {
    try {
      await api.voteBugReport(bugId);
      setStep("done");
    } catch (err) {
      setError(t("voteFailed") + ": " + (err instanceof Error ? err.message : err));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !category) return;
    setSending(true);
    setError(null);
    try {
      await api.createBugReport(`[${category}] ${title.trim()}`, description.trim());
      setStep("done");
    } catch (err) {
      setError(t("failed") + ": " + (err instanceof Error ? err.message : err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {step === "done" ? (
          <>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{t("sentTitle")}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t("sentDescription")}
            </p>
            <div className="flex justify-end">
              <button
                className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600"
                onClick={onClose}
              >
                {t("close")}
              </button>
            </div>
          </>
        ) : step === "search" ? (
          <>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t("title")}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {t("searchPrompt")}
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                className="flex-1 px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t("searchPlaceholder")}
                autoFocus
              />
              <button
                className="px-3 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
              >
                {searching ? t("searching") : t("search")}
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded">
                {error}
              </div>
            )}

            {results.length > 0 && (
              <div className="mb-4 space-y-2 max-h-60 overflow-y-auto">
                {results.map((bug) => (
                  <div key={bug.id} className="border dark:border-gray-700 rounded p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{bug.title}</span>
                      <span className="text-xs text-gray-400">
                        {bug.report_count || 1}×
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">{bug.description}</p>
                    <button
                      className="text-xs px-2 py-1 rounded bg-orange-500 text-white hover:bg-orange-600"
                      onClick={() => handleVote(bug.id)}
                    >
                      {t("meToo")}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!searching && searchQuery.trim() && results.length === 0 && !error && (
              <p className="text-sm text-gray-400 mb-4">{t("noResults")}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-2 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                onClick={onClose}
              >
                {t("cancel")}
              </button>
              <button
                className="px-3 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600"
                onClick={() => setStep("create")}
              >
                {t("createNew")}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t("title")}</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                {t("fieldTitle")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t("titlePlaceholder")}
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                {t("fieldDescription")} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical min-h-[100px]"
                placeholder={t("descriptionPlaceholder")}
                required
                rows={4}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                {t("category")} <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="" disabled>{t("selectCategory")}</option>
                {BUG_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="dark:bg-gray-800 dark:text-gray-100">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="mb-4 p-3 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                onClick={() => setStep("search")}
                disabled={sending}
              >
                {t("back")}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                disabled={sending || !title.trim() || !description.trim() || !category}
              >
                {sending ? t("sending") : t("submit")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
