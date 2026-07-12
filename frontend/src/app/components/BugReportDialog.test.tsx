import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BugReportDialog from "./BugReportDialog";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    createBugReport: vi.fn(),
    searchBugReports: vi.fn(),
    voteBugReport: vi.fn(),
  },
}));

describe("BugReportDialog", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders nothing when closed", () => {
    const { container } = render(<BugReportDialog open={false} onClose={() => { }} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows search step when opened", () => {
    render(<BugReportDialog open={true} onClose={() => { }} />);
    expect(screen.getByText("title")).toBeTruthy();
    expect(screen.getByText("searchPrompt")).toBeTruthy();
    expect(screen.getByPlaceholderText("searchPlaceholder")).toBeTruthy();
    expect(screen.getByText("search")).toBeTruthy();
    expect(screen.getByText("cancel")).toBeTruthy();
    expect(screen.getByText("createNew")).toBeTruthy();
  });

  it("transitions to create step when createNew is clicked", () => {
    render(<BugReportDialog open={true} onClose={() => { }} />);
    fireEvent.click(screen.getByText("createNew"));

    expect(screen.getByText("fieldTitle")).toBeTruthy();
    expect(screen.getByText("fieldDescription")).toBeTruthy();
    expect(screen.getByText("submit")).toBeTruthy();
    expect(screen.getByText("back")).toBeTruthy();
  });

  it("has submit disabled when create form is empty", () => {
    render(<BugReportDialog open={true} onClose={() => { }} />);
    fireEvent.click(screen.getByText("createNew"));
    expect(screen.getByText("submit")).toBeDisabled();
  });

  it("enables submit when create form is filled", () => {
    render(<BugReportDialog open={true} onClose={() => { }} />);
    fireEvent.click(screen.getByText("createNew"));
    fireEvent.change(screen.getByPlaceholderText("titlePlaceholder"), { target: { value: "Test" } });
    fireEvent.change(screen.getByPlaceholderText("descriptionPlaceholder"), { target: { value: "Desc" } });
    expect(screen.getByText("submit")).toBeEnabled();
  });

  it("calls createBugReport on submit", async () => {
    (api.createBugReport as any).mockResolvedValue({ id: "1" });
    render(<BugReportDialog open={true} onClose={() => { }} />);
    fireEvent.click(screen.getByText("createNew"));
    fireEvent.change(screen.getByPlaceholderText("titlePlaceholder"), { target: { value: "Test" } });
    fireEvent.change(screen.getByPlaceholderText("descriptionPlaceholder"), { target: { value: "Desc" } });
    fireEvent.click(screen.getByText("submit"));
    await waitFor(() => {
      expect(api.createBugReport).toHaveBeenCalledWith("Test", "Desc");
    });
    expect(screen.getByText("sentTitle")).toBeTruthy();
  });

  it("shows error on submit failure", async () => {
    (api.createBugReport as any).mockRejectedValue(new Error("Network error"));
    render(<BugReportDialog open={true} onClose={() => { }} />);
    fireEvent.click(screen.getByText("createNew"));
    fireEvent.change(screen.getByPlaceholderText("titlePlaceholder"), { target: { value: "Test" } });
    fireEvent.change(screen.getByPlaceholderText("descriptionPlaceholder"), { target: { value: "Desc" } });
    fireEvent.click(screen.getByText("submit"));
    await waitFor(() => {
      expect(screen.getByText(/failed/)).toBeTruthy();
    });
  });

  it("calls searchBugReports on search", async () => {
    (api.searchBugReports as any).mockResolvedValue([]);
    render(<BugReportDialog open={true} onClose={() => { }} />);
    fireEvent.change(screen.getByPlaceholderText("searchPlaceholder"), { target: { value: "crash" } });
    fireEvent.click(screen.getByText("search"));
    await waitFor(() => {
      expect(api.searchBugReports).toHaveBeenCalledWith("crash");
    });
  });

  it("calls voteBugReport on meToo", async () => {
    (api.searchBugReports as any).mockResolvedValue([
      { id: "b1", title: "Existing bug", description: "Desc", report_count: 3 },
    ]);
    (api.voteBugReport as any).mockResolvedValue({ id: "b1", report_count: 4 });
    render(<BugReportDialog open={true} onClose={() => { }} />);
    fireEvent.change(screen.getByPlaceholderText("searchPlaceholder"), { target: { value: "crash" } });
    fireEvent.click(screen.getByText("search"));
    await waitFor(() => {
      expect(screen.getByText("Existing bug")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("meToo"));
    await waitFor(() => {
      expect(api.voteBugReport).toHaveBeenCalledWith("b1");
    });
    expect(screen.getByText("sentTitle")).toBeTruthy();
  });

  it("shows noResults when search returns empty", async () => {
    (api.searchBugReports as any).mockResolvedValue([]);
    render(<BugReportDialog open={true} onClose={() => { }} />);
    fireEvent.change(screen.getByPlaceholderText("searchPlaceholder"), { target: { value: "zzz" } });
    fireEvent.click(screen.getByText("search"));
    await waitFor(() => {
      expect(screen.getByText("noResults")).toBeTruthy();
    });
  });

  it("calls onClose on cancel", () => {
    const onClose = vi.fn();
    render(<BugReportDialog open={true} onClose={onClose} />);
    fireEvent.click(screen.getByText("cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on backdrop click", () => {
    const onClose = vi.fn();
    render(<BugReportDialog open={true} onClose={onClose} />);
    fireEvent.click(screen.getByText("title").closest(".fixed")!);
    expect(onClose).toHaveBeenCalled();
  });
});
