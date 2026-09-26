import { describe, it, expect, vi, afterEach } from "vitest";
import { renderPagesToDataUrls, printPagesInBrowser } from "./printPages";
import type { PrintOptions } from "../components/PrintOptionsModal";

afterEach(() => {
    delete (window as any).pdfjsLib;
    delete (HTMLImageElement.prototype as any).decode;
    vi.restoreAllMocks();
    document.getElementById("print-style")?.remove();
    document.getElementById("print-overlay")?.remove();
});

// jsdom doesn't implement HTMLImageElement.prototype.decode() at all (not
// even as a rejecting stub), so it has to be added before it can be mocked.
function stubImageDecode() {
    (HTMLImageElement.prototype as any).decode = vi.fn().mockResolvedValue(undefined);
}

describe("renderPagesToDataUrls", () => {
    it("renders each requested page to a PNG data URL and flags the first page's orientation", async () => {
        const getPage = vi.fn().mockImplementation((n: number) => Promise.resolve({
            getViewport: () => (n === 1 ? { width: 200, height: 100 } : { width: 100, height: 200 }),
            render: () => ({ promise: Promise.resolve() }),
        }));
        (window as any).pdfjsLib = { getDocument: () => ({ promise: Promise.resolve({ getPage }) }) };
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as any);
        vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,x");

        const { dataUrls, firstIsLandscape } = await renderPagesToDataUrls("blob:fake", [1, 2]);

        expect(dataUrls).toEqual(["data:image/png;base64,x", "data:image/png;base64,x"]);
        expect(firstIsLandscape).toBe(true);
        expect(getPage).toHaveBeenCalledWith(1);
        expect(getPage).toHaveBeenCalledWith(2);
    });
});

describe("printPagesInBrowser", () => {
    function baseOptions(overrides: Partial<PrintOptions> = {}): PrintOptions {
        return { orientation: "auto", margin: "normal", color: "color", pageRange: "", ...overrides };
    }

    it("does nothing when there are no pages to print", async () => {
        const printSpy = vi.spyOn(window, "print").mockImplementation(() => { });
        await printPagesInBrowser([], false, baseOptions());
        expect(printSpy).not.toHaveBeenCalled();
        expect(document.getElementById("print-overlay")).toBeNull();
    });

    // window.print() is scheduled via two nested requestAnimationFrame calls
    // (giving the browser time to paint the decoded images first) rather than
    // awaited, so the tests below poll for jsdom's rAF polyfill (backed by
    // setTimeout, timing varies under load) to actually fire it.
    async function waitUntil(predicate: () => boolean, timeoutMs = 2000) {
        const start = Date.now();
        while (!predicate()) {
            if (Date.now() - start > timeoutMs) throw new Error("waitUntil timed out");
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
    }

    it("builds a print overlay with one image per page and calls window.print", async () => {
        stubImageDecode();
        const printSpy = vi.spyOn(window, "print").mockImplementation(() => { });

        await printPagesInBrowser(["data:a", "data:b"], false, baseOptions());
        await waitUntil(() => printSpy.mock.calls.length > 0);

        const overlay = document.getElementById("print-overlay");
        expect(overlay).not.toBeNull();
        expect(overlay!.querySelectorAll("img").length).toBe(2);
    });

    it("applies a grayscale filter in the print stylesheet when color mode is grayscale", async () => {
        stubImageDecode();
        const printSpy = vi.spyOn(window, "print").mockImplementation(() => { });

        await printPagesInBrowser(["data:a"], false, baseOptions({ color: "grayscale" }));
        await waitUntil(() => printSpy.mock.calls.length > 0);

        const style = document.getElementById("print-style");
        expect(style!.textContent).toContain("grayscale(1)");
    });
});
