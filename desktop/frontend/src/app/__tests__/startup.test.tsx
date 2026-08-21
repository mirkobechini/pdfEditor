import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StartupPage from "../startup/page";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
}));

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock("../../shared/tauri", () => ({
    getApiBaseUrl: () => "http://127.0.0.1:7723",
}));

describe("StartupPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders startup steps", () => {
        render(<StartupPage />);
        expect(screen.getByText("Avvio del backend in locale...")).toBeInTheDocument();
    });

    it("renders startup title", () => {
        render(<StartupPage />);
        expect(screen.getByText("Avvio di PdfEditor")).toBeInTheDocument();
    });

    it("renders loading indicator", () => {
        render(<StartupPage />);
        const spinner = document.querySelector(".animate-spin");
        expect(spinner).toBeInTheDocument();
    });
});