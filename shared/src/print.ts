/** Expand a range string like "1-3, 5" into page numbers, clamped to totalPages. Empty means all pages. */
export function parsePageRangeList(rangeStr: string, totalPages: number): number[] {
    const all = Array.from({ length: totalPages }, (_, i) => i + 1);
    if (!rangeStr.trim()) return all;

    const pages = new Set<number>();
    for (const part of rangeStr.split(",")) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
        if (rangeMatch) {
            const start = Math.max(1, parseInt(rangeMatch[1], 10));
            const end = Math.min(totalPages, parseInt(rangeMatch[2], 10));
            for (let p = start; p <= end; p++) pages.add(p);
        } else if (/^\d+$/.test(trimmed)) {
            const p = parseInt(trimmed, 10);
            if (p >= 1 && p <= totalPages) pages.add(p);
        }
    }
    return pages.size > 0 ? Array.from(pages).sort((a, b) => a - b) : all;
}
