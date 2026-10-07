/** Dimensione leggibile (B / KB / MB / GB), indipendente dalla lingua. */
export function formatFileSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Data di caricamento nel formato della lingua attiva. */
export function formatUploadDate(dateStr: string | undefined | null, locale: string): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}
