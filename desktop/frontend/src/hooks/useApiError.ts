"use client";

import { useTranslations } from "next-intl";
import { mapError, extractErrorDetail } from "../shared/error-map";

/**
 * Hook che traduce un errore API in un messaggio localizzato.
 *
 * `mapError()` ritorna una chiave i18n (es. "pdf.notFound", "common.mergeTooFew").
 * Questo hook usa `useTranslations()` globale per tradurre la chiave completa
 * con il namespace corretto (pdf/common/auth/admin/bugReport).
 *
 * Uso:
 *   const { apiError } = useApiError();
 *   ...
 *   setError(apiError(err));
 */
export function useApiError() {
  const t = useTranslations();

  function apiError(err: unknown): string {
    const key = mapError(err);
    // mapError ritorna sempre una chiave valida (fallback "common.unknownError")
    return t(key);
  }

  /**
   * Come apiError, ma per gli errori NON riconosciuti (common.unknownError)
   * aggiunge un dettaglio tecnico breve. Usato dove serve capire la causa
   * reale (es. Condividi su desktop); apiError resta invariato altrove.
   */
  function apiErrorWithDetail(err: unknown): string {
    const key = mapError(err);
    const text = t(key);
    if (key === "common.unknownError") {
      const detail = extractErrorDetail(err).replace(/\s+/g, " ").trim();
      if (detail) return `${text} (${detail.slice(0, 120)})`;
    }
    return text;
  }

  return { apiError, apiErrorWithDetail };
}
