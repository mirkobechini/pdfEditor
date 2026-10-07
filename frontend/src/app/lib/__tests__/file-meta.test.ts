import { describe, it, expect } from "vitest";
import { formatFileSize, formatUploadDate } from "../file-meta";

describe("formatFileSize", () => {
    it("formats bytes, KB, MB, GB", () => {
        expect(formatFileSize(512)).toBe("512 B");
        expect(formatFileSize(2048)).toBe("2 KB");
        expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
        expect(formatFileSize(3 * 1024 * 1024 * 1024)).toBe("3.0 GB");
    });
    it("returns empty for invalid input", () => {
        expect(formatFileSize(-1)).toBe("");
        expect(formatFileSize(NaN)).toBe("");
    });
});

describe("formatUploadDate", () => {
    it("formats per locale", () => {
        expect(formatUploadDate("2026-10-07T10:00:00Z", "it")).toBe("07/10/2026");
        expect(formatUploadDate("2026-10-07T10:00:00Z", "en")).toBe("10/07/2026");
    });
    it("returns empty for missing or invalid date", () => {
        expect(formatUploadDate(undefined, "it")).toBe("");
        expect(formatUploadDate("not-a-date", "it")).toBe("");
    });
});
