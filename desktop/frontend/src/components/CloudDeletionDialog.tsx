"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { CloudDeletion } from "../hooks/useCloudSyncCore";

interface CloudDeletionDialogProps {
    /** Prima richiesta in coda (le altre seguono dopo la risposta). */
    deletion: CloudDeletion | null;
    onResolve: (localId: string, action: "delete" | "keep") => void;
}

/**
 * Chiede all'utente cosa fare con un PDF che era sincronizzato e non è più sul
 * cloud (eliminato dal web, che comanda il cloud). Issue #990.
 * - "Elimina anche in locale" → lo rimuove dal dispositivo.
 * - "Tieni solo in locale" → resta sul dispositivo, non più sincronizzato.
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
                <div className="flex gap-3">
                    <button
                        onClick={() => onResolve(deletion.localId, "delete")}
                        className="flex-1 rounded-xl border border-red-500/30 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
                        data-testid="cloud-deletion-delete"
                    >
                        {t("deleteLocal")}
                    </button>
                    <button
                        onClick={() => onResolve(deletion.localId, "keep")}
                        className="flex-1 rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white transition hover:bg-[#ce5a00]"
                        data-testid="cloud-deletion-keep"
                    >
                        {t("keepLocal")}
                    </button>
                </div>
            </div>
        </div>
    );
}
