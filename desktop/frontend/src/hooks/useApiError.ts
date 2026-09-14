"use client";

import { useTranslations } from "next-intl";
import { mapError } from "../shared/error-map";

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

  return { apiError };
}
