import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import MonkeyLogo from "../MonkeyLogo";

// Mock next/image
vi.mock("next/image", () => ({
    default: (props: any) => {
        const { onError, ...rest } = props;
        return (
            <img
                {...rest}
                onError={onError}
                data-testid="monkey-image"
            />
        );
    },
}));

describe("MonkeyLogo", () => {
    it("renders image with default className", () => {
        render(<MonkeyLogo />);
        const img = screen.getByTestId("monkey-image");
        expect(img).toBeInTheDocument();
        expect(img.getAttribute("src")).toBe("/orange-monkey_logo.png");
        expect(img.getAttribute("alt")).toBe("PdfEditor Logo");
    });

    it("renders image with custom className", () => {
        render(<MonkeyLogo className="w-16 h-16" />);
        const img = screen.getByTestId("monkey-image");
        expect(img.className).toContain("w-16");
        expect(img.className).toContain("h-16");
    });

    it("shows fallback P on image error", () => {
        render(<MonkeyLogo />);
        const img = screen.getByTestId("monkey-image");
        fireEvent.error(img);
        expect(screen.getByText("P")).toBeInTheDocument();
    });

    it("fallback keeps custom className", () => {
        render(<MonkeyLogo className="w-16 h-16" />);
        const img = screen.getByTestId("monkey-image");
        fireEvent.error(img);
        const fallback = screen.getByText("P");
        expect(fallback.className).toContain("w-16");
        expect(fallback.className).toContain("h-16");
    });
});