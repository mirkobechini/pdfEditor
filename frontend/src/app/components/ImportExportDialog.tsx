"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api } from "../lib/api";
import { mapError } from "../lib/error-map";
import { downloadBlob } from "../lib/download";

interface ImportExportDialogProps {
    open: boolean;
    onClose: () => void;
    selectedId: string | null;
    selectedName: string;
    onImportSuccess?: (doc: { id: string; original_filename: string }) => void;
}

const IMPORT_ACCEPT = ".txt,.png,.jpg,.jpeg,.gif,.bmp";
const EXPORT_FORMATS = ["txt", "png", "jpg", "svg"];

export default function ImportExportDialog({
    open,
    onClose,
    selectedId,
    selectedName,
    onImportSuccess,
}: ImportExportDialogProps) {
    const t = useTranslations("importExportDialog");
    const [tab, setTab] = React.useState<"import" | "export">("import");
    const [importFile, setImportFile] = React.useState<File | null>(null);
    const [exportFormat, setExportFormat] = React.useState("txt");
    const [exportName, setExportName] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState("");
    const [success, setSuccess] = React.useState("");

    React.useEffect(() => {
        if (open) {
            setTab("import");
            setImportFile(null);
            setExportFormat("txt");
            setExportName("");
            setError("");
            setSuccess("");
        }
    }, [open]);

    if (!open) return null;

    async function handleImport() {
        if (!importFile) return;
        setBusy(true);
        setError("");
        setSuccess("");
        try {
            const doc = await api.importFile(importFile);
            setSuccess(t("importSuccess"));
            onImportSuccess?.(doc);
            onClose();
        } catch (err) {
            setError(t("importFailed") + ": " + mapError(err));
        } finally {
            setBusy(false);
        }
    }

    async function handleExport() {
        if (!selectedId) {
            setError(t("noPdfSelected"));
            return;
        }
        setBusy(true);
        setError("");
        setSuccess("");
        try {
            const blob = await api.exportPdf(selectedId, exportFormat);
            const base = selectedName.replace(/\.pdf$/i, "");
            const filename = exportName.trim() || `${base}.${exportFormat}`;
            downloadBlob(blob, filename);
            setSuccess(t("exportSuccess"));
        } catch (err) {
            setError(t("exportFailed") + ": " + mapError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t("title")}
                </h2>

                {/* Tabs */}
                <div className="mt-3 flex gap-2">
                    <button
                        onClick={() => setTab("import")}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "import"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            }`}
                    >
                        {t("importTab")}
                    </button>
                    <button
                        onClick={() => setTab("export")}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "export"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            }`}
                    >
                        {t("exportTab")}
                    </button>
                </div>

                <div className="mt-4 space-y-4">
                    {tab === "import" ? (
                        <>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t("importDesc")}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                                {t("importFormats")}
                            </p>
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <span className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm cursor-pointer">
                                    {t("chooseFile")}
                                </span>
                                <input
                                    type="file"
                                    accept={IMPORT_ACCEPT}
                                    onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                                    className="hidden"
                                />
                            </label>
                            {importFile && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {importFile.name}
                                </p>
                            )}
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t("exportDesc")}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                                {t("exportFormats")}
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t("exportFormat")}
                                </label>
                                <select
                                    value={exportFormat}
                                    onChange={(e) => setExportFormat(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                                >
                                    {EXPORT_FORMATS.map((f) => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t("exportName")}
                                </label>
                                <input
                                    type="text"
                                    value={exportName}
                                    onChange={(e) => setExportName(e.target.value)}
                                    placeholder={`${selectedName.replace(/\.pdf$/i, "")}.${exportFormat}`}
                                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                                />
                            </div>
                        </>
                    )}

                    {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                    {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        {t("cancel")}
                    </button>
                    <button
                        onClick={tab === "import" ? handleImport : handleExport}
                        disabled={busy || (tab === "import" && !importFile)}
                        className="flex-1 rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white hover:bg-[#ce5a00]"
                    >
                        {busy
                            ? (tab === "import" ? t("importing") : t("exporting"))
                            : (tab === "import" ? t("import") : t("export"))}
                    </button>
                </div>
            </div>
        </div>
    );
}