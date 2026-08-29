import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReplaceTextModal from "../ReplaceTextModal";

const mockOnClose = vi.fn();
const mockOnSuccess = vi.fn();

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

vi.mock("../../shared/api", () => ({
    api: { replaceText: vi.fn() },
}));

import { api } from "../../shared/api";

const baseProps = {
    open: true,
    onClose: mockOnClose,
    pdfId: "p1",
    onSuccess: mockOnSuccess,
};

describe("ReplaceTextModal", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders nothing when closed", () => {
        const { container } = render(<ReplaceTextModal {...baseProps} open={false} />);
        expect(container.innerHTML).toBe("");
    });

    it("renders form when open", () => {
        render(<ReplaceTextModal {...baseProps} />);
        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("does not call API when search is empty", async () => {
        render(<ReplaceTextModal {...baseProps} />);
        fireEvent.click(screen.getByText("replace"));
        await new Promise((r) => setTimeout(r, 100));
        expect(api.replaceText).not.toHaveBeenCalled();
    });

    it("calls replaceText with replaceAll=true by default", async () => {
        (api.replaceText as any).mockResolvedValue({});
        render(<ReplaceTextModal {...baseProps} />);
        const inputs = screen.getAllByRole("textbox");
        fireEvent.change(inputs[0], { target: { value: "old" } });
        fireEvent.change(inputs[1], { target: { value: "new" } });
        fireEvent.click(screen.getByText("replace"));
        await waitFor(() => {
            expect(api.replaceText).toHaveBeenCalledWith("p1", "old", "new", undefined, undefined);
        });
    });

    it("calls replaceText with occurrence=1 when replaceAll is off", async () => {
        (api.replaceText as any).mockResolvedValue({});
        render(<ReplaceTextModal {...baseProps} />);
        const inputs = screen.getAllByRole("textbox");
        fireEvent.change(inputs[0], { target: { value: "old" } });
        fireEvent.change(inputs[1], { target: { value: "new" } });
        fireEvent.click(screen.getByRole("checkbox"));
        fireEvent.click(screen.getByText("replace"));
        await waitFor(() => {
            expect(api.replaceText).toHaveBeenCalledWith("p1", "old", "new", 1, undefined);
        });
    });

    it("closes after successful replace", async () => {
        (api.replaceText as any).mockResolvedValue({});
        render(<ReplaceTextModal {...baseProps} />);
        const inputs = screen.getAllByRole("textbox");
        fireEvent.change(inputs[0], { target: { value: "old" } });
        fireEvent.change(inputs[1], { target: { value: "new" } });
        fireEvent.click(screen.getByText("replace"));
        await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
    });

    it("shows error on API failure", async () => {
        (api.replaceText as any).mockRejectedValue(new Error("Not found"));
        render(<ReplaceTextModal {...baseProps} />);
        const inputs = screen.getAllByRole("textbox");
        fireEvent.change(inputs[0], { target: { value: "old" } });
        fireEvent.change(inputs[1], { target: { value: "new" } });
        fireEvent.click(screen.getByText("replace"));
        expect(await screen.findByText(/replaceFailed/)).toBeInTheDocument();
    });

    it("shows replacing loading state", async () => {
        (api.replaceText as any).mockImplementation(() => new Promise(() => { }));
        render(<ReplaceTextModal {...baseProps} />);
        const inputs = screen.getAllByRole("textbox");
        fireEvent.change(inputs[0], { target: { value: "old" } });
        fireEvent.change(inputs[1], { target: { value: "new" } });
        fireEvent.click(screen.getByText("replace"));
        expect(await screen.findByText("replacing")).toBeInTheDocument();
    });

    it("calls onSuccess with the result after replace", async () => {
        const mockResult = { id: "p1", original_filename: "replaced.pdf", file_size: 500, page_count: 5, is_password_protected: false, created_at: "2026-01-01", updated_at: "2026-01-01" };
        (api.replaceText as any).mockResolvedValue(mockResult);
        render(<ReplaceTextModal {...baseProps} />);
        const inputs = screen.getAllByRole("textbox");
        fireEvent.change(inputs[0], { target: { value: "old" } });
        fireEvent.change(inputs[1], { target: { value: "new" } });
        fireEvent.click(screen.getByText("replace"));
        await waitFor(() => {
            expect(mockOnSuccess).toHaveBeenCalledWith(mockResult);
        });
    });
});
