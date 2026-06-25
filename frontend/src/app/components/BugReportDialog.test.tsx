import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BugReportDialog from "./BugReportDialog";
import { api } from "../lib/api";

// Wrap with minimal i18n context for translated components
vi.mock("../lib/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "it" as const,
    setLocale: () => {},
  }),
}));

vi.mock("../lib/api", () => ({
  api: {
    createBugReport: vi.fn(),
  },
}));

describe("BugReportDialog", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <BugReportDialog open={false} onClose={() => {}} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders form fields when open", () => {
    render(<BugReportDialog open={true} onClose={() => {}} />);

    expect(screen.getByText("bugReport.title")).toBeTruthy();
    expect(screen.getByText("bugReport.fieldTitle")).toBeTruthy();
    expect(screen.getByText("bugReport.fieldDescription")).toBeTruthy();
    expect(screen.getByText("bugReport.submit")).toBeTruthy();
    expect(screen.getByText("bugReport.cancel")).toBeTruthy();
  });

  it("has Submit button disabled when form is empty", () => {
    render(<BugReportDialog open={true} onClose={() => {}} />);

    const submitBtn = screen.getByText("bugReport.submit");
    expect(submitBtn).toBeDisabled();
  });

  it("enables Submit button when form is filled", () => {
    render(<BugReportDialog open={true} onClose={() => {}} />);

    const titleInput = screen.getByPlaceholderText("bugReport.titlePlaceholder");
    const descInput = screen.getByPlaceholderText("bugReport.descriptionPlaceholder");

    fireEvent.change(titleInput, { target: { value: "Test bug" } });
    fireEvent.change(descInput, { target: { value: "Test description" } });

    expect(screen.getByText("bugReport.submit")).toBeEnabled();
  });

  it("calls createBugReport on submit and shows success", async () => {
    (api.createBugReport as any).mockResolvedValue({ id: "1" });

    render(<BugReportDialog open={true} onClose={() => {}} />);

    const titleInput = screen.getByPlaceholderText("bugReport.titlePlaceholder");
    const descInput = screen.getByPlaceholderText("bugReport.descriptionPlaceholder");

    fireEvent.change(titleInput, { target: { value: "Test bug" } });
    fireEvent.change(descInput, { target: { value: "Test description" } });

    fireEvent.click(screen.getByText("bugReport.submit"));

    await waitFor(() => {
      expect(api.createBugReport).toHaveBeenCalledWith("Test bug", "Test description");
    });

    expect(screen.getByText("bugReport.sentTitle")).toBeTruthy();
  });

  it("shows error message on failure", async () => {
    (api.createBugReport as any).mockRejectedValue(new Error("Network error"));

    render(<BugReportDialog open={true} onClose={() => {}} />);

    const titleInput = screen.getByPlaceholderText("bugReport.titlePlaceholder");
    const descInput = screen.getByPlaceholderText("bugReport.descriptionPlaceholder");

    fireEvent.change(titleInput, { target: { value: "Test bug" } });
    fireEvent.change(descInput, { target: { value: "Test description" } });

    fireEvent.click(screen.getByText("bugReport.submit"));

    await waitFor(() => {
      expect(screen.getByText(/bugReport.failed/)).toBeTruthy();
    });
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(<BugReportDialog open={true} onClose={onClose} />);

    fireEvent.click(screen.getByText("bugReport.cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();

    render(<BugReportDialog open={true} onClose={onClose} />);

    // The backdrop is the outermost div with bg-black/40
    const backdrop = screen.getByText("bugReport.title").closest(".fixed")!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("resets form on re-open", () => {
    const { rerender } = render(<BugReportDialog open={true} onClose={() => {}} />);

    // Fill form
    const titleInput = screen.getByPlaceholderText("bugReport.titlePlaceholder") as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "Test" } });

    // Close and re-open
    rerender(<BugReportDialog open={false} onClose={() => {}} />);
    rerender(<BugReportDialog open={true} onClose={() => {}} />);

    const newTitleInput = screen.getByPlaceholderText("bugReport.titlePlaceholder") as HTMLInputElement;
    expect(newTitleInput.value).toBe("");
  });
});
