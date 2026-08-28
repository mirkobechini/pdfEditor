import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act, fireEvent } from "@testing-library/react";
import React from "react";
import { usePdfJs } from "../usePdfJs";

function TestComponent() {
    const loaded = usePdfJs();
    return <div data-testid="pdfjs-loaded">{loaded ? "yes" : "no"}</div>;
}

describe("usePdfJs", () => {
    beforeEach(() => {
        delete (window as any).pdfjsLib;
        // Remove leftover script tags appended to body by previous tests
        // (RTL cleanup unmounts components but does NOT remove direct
        //  document.body.appendChild additions)
        document
            .querySelectorAll("script[src*='pdf.min.js']")
            .forEach((s) => s.remove());
    });

    it("returns false initially", () => {
        const { getByTestId } = render(<TestComponent />);
        expect(getByTestId("pdfjs-loaded").textContent).toBe("no");
    });

    it("returns true when pdfjsLib already exists on window", () => {
        (window as any).pdfjsLib = { GlobalWorkerOptions: { workerSrc: "" } };
        const { getByTestId } = render(<TestComponent />);
        expect(getByTestId("pdfjs-loaded").textContent).toBe("yes");
    });

    it("sets workerSrc when pdfjsLib already exists", () => {
        (window as any).pdfjsLib = { GlobalWorkerOptions: { workerSrc: "" } };
        render(<TestComponent />);
        expect((window as any).pdfjsLib.GlobalWorkerOptions.workerSrc).toContain(
            "pdf.worker",
        );
    });

    it("loads script and sets loaded on onload", async () => {
        const { getByTestId } = render(<TestComponent />);
        expect(getByTestId("pdfjs-loaded").textContent).toBe("no");

        // Find the script element created by the hook
        const script = document.querySelector(
            "script[src*='pdf.min.js']",
        ) as HTMLScriptElement | null;
        expect(script).not.toBeNull();

        // Simulate script loading completing by firing the load event
        await act(async () => {
            (window as any).pdfjsLib = {
                GlobalWorkerOptions: { workerSrc: "" },
            };
            fireEvent.load(script as HTMLScriptElement);
        });

        expect(getByTestId("pdfjs-loaded").textContent).toBe("yes");
        expect((window as any).pdfjsLib.GlobalWorkerOptions.workerSrc).toContain(
            "pdf.worker",
        );
    });
});
