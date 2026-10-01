// Helper puri dell'editor desktop — estratti da app/app/page.tsx (issue #881, T1).
// Solo funzioni pure / formattazione: nessuna logica di stato o side-effect.

const PLATFORM_ICONS: Record<string, string> = {
    web: "🌐",
    desktop: "💻",
    mobile: "📱",
};

export function getPlatformIcon(source?: string): string {
    if (!source) return "☁️";
    return PLATFORM_ICONS[source] || "☁️";
}

const MIME_BY_EXT: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    bmp: "image/bmp",
    txt: "text/plain",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function mimeFromName(filename: string): string {
    const ext = filename.toLowerCase().split(".").pop() || "";
    return MIME_BY_EXT[ext] || "application/octet-stream";
}

/** Riceve il traduttore (`te`) dal chiamante per i suffissi localizzati. */
export function formatFileSize(bytes: number, te: (k: string) => string): string {
    if (bytes < 1024) return bytes + " " + te("bytes");
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " " + te("kilobytes");
    return (bytes / (1024 * 1024)).toFixed(1) + " " + te("megabytes");
}

export function formatDate(dateStr: string, te: (k: string) => string): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ora";
    if (mins < 60) return mins + te("minutesAgo");
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + te("hoursAgo");
    const days = Math.floor(hours / 24);
    if (days < 7) return days + te("daysAgo");
    return d.toLocaleDateString();
}