"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api } from "../shared/api";
import { tauriInvoke } from "../shared/tauri";
import type { PdfDocument } from "../shared/types";
import { useApiError } from "../hooks/useApiError";

interface ImportExportModalProps {
    open: boolean;
    pdfId: string;
    pdfName: string;
    onClose: () => void;
    onImported: (doc: PdfDocument) => void;
}

const IMPORT_ACCEPT = ".txt,.png,.jpg,.jpeg,.gif,.bmp";
const EXPORT_FORMATS = ["txt", "png", "jpg", "svg"];

export default function ImportExportModal({ open, pdfId, pdfName, onClose, onImported }: ImportExportModalProps) {
    const t = useTranslations("importExportModal");
    const { apiError } = useApiError();
    const [tab, setTab] = React.useState<"import" | "export">("import");
    const [importName, setImportName] = React.useState("");
    const [exportFormat, setExportFormat] = React.useState("txt");
    const [exportName, setExportName] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (open) {
            setTab("import");
            setImportName("");
            setExportFormat("txt");
            setExportName("");
            setError(null);
        }
    }, [open]);

    if (!open) return null;

    async function handleImport() {
        setBusy(true); setError(null);
        try {
            const filePath = await tauriInvoke<string>("dialog_open", {
                filters: [
                    { name: "Immagini", extensions: ["png", "jpg", "jpeg", "gif", "bmp"] },
                    { name: "Documenti", extensions: ["txt", "docx"] },
                    { name: "Tutti i file", extensions: ["*"] },
                ],
            });
            if (!filePath) return;
            const raw = await tauriInvoke<number[]>("read_file_binary", { path: filePath });
            if (!raw) return;
            const name = filePath.split(/[/\\]/).pop() || "document.txt";
            const blob = new Blob([new Uint8Array(raw)], { type: "application/octet-stream" });
            const file = new File([blob], name, { type: "application/octet-stream" });
            const doc = await api.importFile(file);
            onImported(doc);
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally { setBusy(false); }
    }

    async function handleExport() {
        if (!pdfId) {
            setError(t("noPdfSelected"));
            return;
        }
        setBusy(true); setError(null);
        try {
            const blob = await api.exportPdf(pdfId, exportFormat);
            const arrayBuf = await blob.arrayBuffer();
            const data = Array.from(new Uint8Array(arrayBuf));
            const base = pdfName.replace(/\.pdf$/i, "");
            const defaultName = exportName.trim() || `${base}.${exportFormat}`;
            const saved = await tauriInvoke<string>("dialog_save", {
                defaultName,
                data,
                defaultFolder: null,
            });
            if (!saved) return;
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally { setBusy(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-white">{t("title")}</h2>
                    <button onClick={onClose} className="h-8 w-8 rounded-lg text-[#9a8d80] hover:bg-white/10 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setTab("import")}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === "import"
                            ? "bg-[#f7871f] text-white"
                            : "bg-white/5 text-[#9a8d80] hover:bg-white/10"}`}
                    >
                        {t("importTab")}
                    </button>
                    <button
                        onClick={() => setTab("export")}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === "export"
                            ? "bg-[#f7871f] text-white"
                            : "bg-white/5 text-[#9a8d80] hover:bg-white/10"}`}
                    >
                        {t("exportTab")}
                    </button>
                </div>

                <div className="space-y-4">
                    {tab === "import" ? (
                        <>
                            <p className="text-sm text-[#9a8d80]">{t("importDesc")}</p>
                            <p className="text-xs text-[#6b5e52]">{t("importFormats")}</p>
                            <button
                                onClick={handleImport}
                                disabled={busy}
                                className="w-full rounded-lg bg-[#f7871f] py-2.5 text-sm font-semibold text-white hover:bg-[#ce5a00] disabled:opacity-50"
                            >
                                {busy ? t("importing") : t("chooseFile")}
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-[#9a8d80]">{t("exportDesc")}</p>
                            <p className="text-xs text-[#6b5e52]">{t("exportFormats")}</p>
                            <div>
                                <label className="block text-sm font-medium text-[#d8d8d8]">{t("exportFormat")}</label>
                                <select
                                    value={exportFormat}
                                    onChange={(e) => setExportFormat(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#2a241d] px-3 py-2 text-sm text-white"
                                >
                                    {EXPORT_FORMATS.map((f) => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#d8d8d8]">{t("exportName")}</label>
                                <input
                                    type="text"
                                    value={exportName}
                                    onChange={(e) => setExportName(e.target.value)}
                                    placeholder={`${pdfName.replace(/\.pdf$/i, "")}.${exportFormat}`}
                                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#2a241d] px-3 py-2 text-sm text-white"
                                />
                            </div>
                        </>
                    )}

                    {error && <p className="text-sm text-red-400">{error}</p>}
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[#9a8d80] hover:bg-white/10"
                    >
                        {t("cancel")}
                    </button>
                    <button
                        onClick={tab === "import" ? handleImport : handleExport}
                        disabled={busy}
                        className="flex-1 rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white hover:bg-[#ce5a00] disabled:opacity-50"
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