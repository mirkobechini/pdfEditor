"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { CloudDeletion } from "../hooks/useCloudSyncCore";

interface CloudDeletionDialogProps {
    /** Prima richiesta in coda (le altre seguono dopo la risposta). */
    deletion: CloudDeletion | null;
    onResolve: (
        localId: string,
        action: "delete" | "keep" | "reupload",
    ) => void;
}

/**
 * Chiede all'utente cosa fare con un PDF che era sincronizzato e non è più sul
 * cloud (eliminato dal web, che comanda il cloud). Issue #990.
 * - "Ricarica sul cloud" → lo riporta online (nuovo mapping).
 * - "Tieni solo in locale" → resta sul dispositivo, non più sincronizzato.
 * - "Elimina anche in locale" → lo rimuove dal dispositivo.
 */
export default function CloudDeletionDialog({
    deletion,
    onResolve,
}: CloudDeletionDialogProps) {
    const t = useTranslations("cloudDeletion");

    if (!deletion) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl">
                <h2 className="mb-3 text-base font-bold text-white">{t("title")}</h2>
                <p className="mb-5 text-sm text-[#c4b9ad]">
                    {t("desc", { name: deletion.name })}
                </p>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => onResolve(deletion.localId, "reupload")}
                        className="w-full rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white transition hover:bg-[#ce5a00]"
                        data-testid="cloud-deletion-reupload"
                    >
                        {t("reupload")}
                    </button>
                    <button
                        onClick={() => onResolve(deletion.localId, "keep")}
                        className="w-full rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[#c4b9ad] transition hover:bg-white/5"
                        data-testid="cloud-deletion-keep"
                    >
                        {t("keepLocal")}
                    </button>
                    <button
                        onClick={() => onResolve(deletion.localId, "delete")}
                        className="w-full rounded-xl border border-red-500/30 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
                        data-testid="cloud-deletion-delete"
                    >
                        {t("deleteLocal")}
                    </button>
                </div>
            </div>
        </div>
    );
}
