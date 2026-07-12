import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import ReplaceTextDialog from "../ReplaceTextDialog";

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock("../../lib/api", () => ({
    api: { replaceText: vi.fn() },
}));

import { api } from "../../lib/api";

const defaultProps = { open: true, onClose: vi.fn(), pdfId: "pdf-1" };

describe("ReplaceTextDialog", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders nothing when closed", () => {
        const { container } = render(<ReplaceTextDialog {...defaultProps} open={false} />);
        expect(container.innerHTML).toBe("");
    });

    it("renders form when open", () => {
        render(<ReplaceTextDialog {...defaultProps} />);
        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("does not call API when search is empty", async () => {
        render(<ReplaceTextDialog {...defaultProps} />);
        fireEvent.click(screen.getByText("replace"));
        await new Promise((r) => setTimeout(r, 100));
        expect(api.replaceText).not.toHaveBeenCalled();
    });

    it("calls replaceText with replaceAll=true by default", async () => {
        (api.replaceText as any).mockResolvedValue({});
        render(<ReplaceTextDialog {...defaultProps} />);
        const inputs = screen.getAllByRole("textbox");
        fireEvent.change(inputs[0], { target: { value: "old" } });
        fireEvent.change(inputs[1], { target: { value: "new" } });
        fireEvent.click(screen.getByText("replace"));
        await vi.waitFor(() => {
            expect(api.replaceText).toHaveBeenCalledWith("pdf-1", "old", "new", undefined);
        });
    });

    it("calls replaceText with occurrence=1 when replaceAll is off", async () => {
        (api.replaceText as any).mockResolvedValue({});
        render(<ReplaceTextDialog {...defaultProps} />);
        const inputs = screen.getAllByRole("textbox");
        fireEvent.change(inputs[0], { target: { value: "old" } });
        fireEvent.change(inputs[1], { target: { value: "new" } });
        fireEvent.click(screen.getByRole("checkbox"));
        fireEvent.click(screen.getByText("replace"));
        await vi.waitFor(() => {
            expect(api.replaceText).toHaveBeenCalledWith("pdf-1", "old", "new", 1);
        });
    });

    it("closes after successful replace", async () => {
        const onClose = vi.fn();
        (api.replaceText as any).mockResolvedValue({});
        render(<ReplaceTextDialog {...defaultProps} onClose={onClose} />);
        const inputs = screen.getAllByRole("textbox");
        fireEvent.change(inputs[0], { target: { value: "old" } });
        fireEvent.change(inputs[1], { target: { value: "new" } });
        fireEvent.click(screen.getByText("replace"));
        await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it("shows error on API failure", async () => {
        (api.replaceText as any).mockRejectedValue(new Error("Not found"));
        render(<ReplaceTextDialog {...defaultProps} />);
        const inputs = screen.getAllByRole("textbox");
        fireEvent.change(inputs[0], { target: { value: "old" } });
        fireEvent.change(inputs[1], { target: { value: "new" } });
        fireEvent.click(screen.getByText("replace"));
        expect(await screen.findByText(/replaceFailed/)).toBeInTheDocument();
    });

    it("shows replacing loading state", async () => {
        (api.replaceText as any).mockImplementation(() => new Promise(() => {}));
        render(<ReplaceTextDialog {...defaultProps} />);
        const inputs = screen.getAllByRole("textbox");
        fireEvent.change(inputs[0], { target: { value: "old" } });
        fireEvent.change(inputs[1], { target: { value: "new" } });
        fireEvent.click(screen.getByText("replace"));
        expect(await screen.findByText("replacing")).toBeInTheDocument();
    });

    it("closes when clicking overlay", () => {
        const onClose = vi.fn();
        render(<ReplaceTextDialog {...defaultProps} onClose={onClose} />);
        fireEvent.click(screen.getByText("title").closest(".fixed")!);
        expect(onClose).toHaveBeenCalled();
    });
});
