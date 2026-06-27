import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BugReportDialog from "./BugReportDialog";
import { api } from "../lib/api";

// Wrap with minimal i18n context for translated components
vi.mock("../lib/api", () => ({
  api: {
    createBugReport: vi.fn(),
  },
}));

describe("BugReportDialog", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <BugReportDialog open={false} onClose={() => { }} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders form fields when open", () => {
    render(<BugReportDialog open={true} onClose={() => { }} />);

    expect(screen.getByText("title")).toBeTruthy();
    expect(screen.getByText("fieldTitle")).toBeTruthy();
    expect(screen.getByText("fieldDescription")).toBeTruthy();
    expect(screen.getByText("submit")).toBeTruthy();
    expect(screen.getByText("cancel")).toBeTruthy();
  });

  it("has Submit button disabled when form is empty", () => {
    render(<BugReportDialog open={true} onClose={() => { }} />);

    const submitBtn = screen.getByText("submit");
    expect(submitBtn).toBeDisabled();
  });

  it("enables Submit button when form is filled", () => {
    render(<BugReportDialog open={true} onClose={() => { }} />);

    const titleInput = screen.getByPlaceholderText("titlePlaceholder");
    const descInput = screen.getByPlaceholderText("descriptionPlaceholder");

    fireEvent.change(titleInput, { target: { value: "Test bug" } });
    fireEvent.change(descInput, { target: { value: "Test description" } });

    expect(screen.getByText("submit")).toBeEnabled();
  });

  it("calls createBugReport on submit and shows success", async () => {
    (api.createBugReport as any).mockResolvedValue({ id: "1" });

    render(<BugReportDialog open={true} onClose={() => { }} />);

    const titleInput = screen.getByPlaceholderText("titlePlaceholder");
    const descInput = screen.getByPlaceholderText("descriptionPlaceholder");

    fireEvent.change(titleInput, { target: { value: "Test bug" } });
    fireEvent.change(descInput, { target: { value: "Test description" } });

    fireEvent.click(screen.getByText("submit"));

    await waitFor(() => {
      expect(api.createBugReport).toHaveBeenCalledWith("Test bug", "Test description");
    });

    expect(screen.getByText("sentTitle")).toBeTruthy();
  });

  it("shows error message on failure", async () => {
    (api.createBugReport as any).mockRejectedValue(new Error("Network error"));

    render(<BugReportDialog open={true} onClose={() => { }} />);

    const titleInput = screen.getByPlaceholderText("titlePlaceholder");
    const descInput = screen.getByPlaceholderText("descriptionPlaceholder");

    fireEvent.change(titleInput, { target: { value: "Test bug" } });
    fireEvent.change(descInput, { target: { value: "Test description" } });

    fireEvent.click(screen.getByText("submit"));

    await waitFor(() => {
      expect(screen.getByText(/failed/)).toBeTruthy();
    });
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(<BugReportDialog open={true} onClose={onClose} />);

    fireEvent.click(screen.getByText("cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();

    render(<BugReportDialog open={true} onClose={onClose} />);

    // The backdrop is the outermost div with bg-black/40
    const backdrop = screen.getByText("title").closest(".fixed")!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("resets form on re-open", () => {
    const { rerender } = render(<BugReportDialog open={true} onClose={() => { }} />);

    // Fill form
    const titleInput = screen.getByPlaceholderText("titlePlaceholder") as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "Test" } });

    // Close and re-open
    rerender(<BugReportDialog open={false} onClose={() => { }} />);
    rerender(<BugReportDialog open={true} onClose={() => { }} />);

    const newTitleInput = screen.getByPlaceholderText("titlePlaceholder") as HTMLInputElement;
    expect(newTitleInput.value).toBe("");
  });
});
