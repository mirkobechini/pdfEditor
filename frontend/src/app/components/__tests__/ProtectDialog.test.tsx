import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import ProtectDialog from "../ProtectDialog";

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock("../../lib/api", () => ({
    api: { protectPdf: vi.fn() },
}));

import { api } from "../../lib/api";

const defaultProps = { open: true, onClose: vi.fn(), pdfId: "pdf-1" };

describe("ProtectDialog", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders nothing when closed", () => {
        const { container } = render(<ProtectDialog {...defaultProps} open={false} />);
        expect(container.innerHTML).toBe("");
    });

    it("renders form when open", () => {
        render(<ProtectDialog {...defaultProps} />);
        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("shows error when passwords don't match", async () => {
        render(<ProtectDialog {...defaultProps} />);
        fireEvent.change(screen.getByPlaceholderText("passwordPlaceholder"), { target: { value: "secret" } });
        fireEvent.change(screen.getByPlaceholderText("confirmPlaceholder"), { target: { value: "different" } });
        fireEvent.click(screen.getByText("protect"));
        expect(await screen.findByText("passwordMismatch")).toBeInTheDocument();
    });

    it("shows error when password too short", async () => {
        render(<ProtectDialog {...defaultProps} />);
        fireEvent.change(screen.getByPlaceholderText("passwordPlaceholder"), { target: { value: "ab" } });
        fireEvent.change(screen.getByPlaceholderText("confirmPlaceholder"), { target: { value: "ab" } });
        fireEvent.click(screen.getByText("protect"));
        expect(await screen.findByText("passwordTooShort")).toBeInTheDocument();
    });

    it("calls protectPdf on valid submission", async () => {
        (api.protectPdf as any).mockResolvedValue({});
        render(<ProtectDialog {...defaultProps} />);
        fireEvent.change(screen.getByPlaceholderText("passwordPlaceholder"), { target: { value: "validPass123" } });
        fireEvent.change(screen.getByPlaceholderText("confirmPlaceholder"), { target: { value: "validPass123" } });
        fireEvent.click(screen.getByText("protect"));
        await vi.waitFor(() => {
            expect(api.protectPdf).toHaveBeenCalledWith("pdf-1", "validPass123");
        });
    });

    it("closes after successful protect", async () => {
        const onClose = vi.fn();
        (api.protectPdf as any).mockResolvedValue({});
        render(<ProtectDialog {...defaultProps} onClose={onClose} />);
        fireEvent.change(screen.getByPlaceholderText("passwordPlaceholder"), { target: { value: "validPass123" } });
        fireEvent.change(screen.getByPlaceholderText("confirmPlaceholder"), { target: { value: "validPass123" } });
        fireEvent.click(screen.getByText("protect"));
        await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it("shows error on API failure", async () => {
        (api.protectPdf as any).mockRejectedValue(new Error("Failed"));
        render(<ProtectDialog {...defaultProps} />);
        fireEvent.change(screen.getByPlaceholderText("passwordPlaceholder"), { target: { value: "validPass123" } });
        fireEvent.change(screen.getByPlaceholderText("confirmPlaceholder"), { target: { value: "validPass123" } });
        fireEvent.click(screen.getByText("protect"));
        expect(await screen.findByText(/protectFailed/)).toBeInTheDocument();
    });

    it("shows protecting loading state", async () => {
        (api.protectPdf as any).mockImplementation(() => new Promise(() => {}));
        render(<ProtectDialog {...defaultProps} />);
        fireEvent.change(screen.getByPlaceholderText("passwordPlaceholder"), { target: { value: "validPass123" } });
        fireEvent.change(screen.getByPlaceholderText("confirmPlaceholder"), { target: { value: "validPass123" } });
        fireEvent.click(screen.getByText("protect"));
        expect(await screen.findByText("protecting")).toBeInTheDocument();
    });

    it("closes when clicking overlay", () => {
        const onClose = vi.fn();
        render(<ProtectDialog {...defaultProps} onClose={onClose} />);
        fireEvent.click(screen.getByText("title").closest(".fixed")!);
        expect(onClose).toHaveBeenCalled();
    });
});
