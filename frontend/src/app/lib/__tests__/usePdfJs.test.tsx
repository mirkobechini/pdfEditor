import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { usePdfJs } from "../usePdfJs";

function TestComponent() {
    const loaded = usePdfJs();
    return <div data-testid="pdfjs-loaded">{loaded ? "yes" : "no"}</div>;
}

describe("usePdfJs", () => {
    beforeEach(() => {
        delete (window as any).pdfjsLib;
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
});
