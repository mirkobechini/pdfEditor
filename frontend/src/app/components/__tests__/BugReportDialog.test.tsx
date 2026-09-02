import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import BugReportDialog from "../BugReportDialog";

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

const mockSearchBugReports = vi.fn();
const mockVoteBugReport = vi.fn();
const mockCreateBugReport = vi.fn();
vi.mock("../../lib/api", () => ({
    api: {
        searchBugReports: (...args: any[]) => mockSearchBugReports(...args),
        voteBugReport: (...args: any[]) => mockVoteBugReport(...args),
        createBugReport: (...args: any[]) => mockCreateBugReport(...args),
    },
}));

const defaultProps = {
    open: true,
    onClose: vi.fn(),
};

describe("BugReportDialog", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders when open", () => {
        render(<BugReportDialog {...defaultProps} />);
        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
        const { container } = render(<BugReportDialog {...defaultProps} open={false} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("shows search prompt and input", () => {
        render(<BugReportDialog {...defaultProps} />);
        expect(screen.getByText("searchPrompt")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("searchPlaceholder")).toBeInTheDocument();
        expect(screen.getByText("search")).toBeInTheDocument();
    });

    it("searches bugs and displays results", async () => {
        mockSearchBugReports.mockResolvedValue([
            { id: "b1", title: "Bug one", description: "First bug", report_count: 3 },
            { id: "b2", title: "Bug two", description: "Second bug", report_count: 1 },
        ]);
        render(<BugReportDialog {...defaultProps} />);
        fireEvent.change(screen.getByPlaceholderText("searchPlaceholder"), {
            target: { value: "bug" },
        });
        fireEvent.click(screen.getByText("search"));
        await waitFor(() => {
            expect(mockSearchBugReports).toHaveBeenCalledWith("bug");
        });
        expect(screen.getByText("Bug one")).toBeInTheDocument();
        expect(screen.getByText("Bug two")).toBeInTheDocument();
        expect(screen.getByText("3×")).toBeInTheDocument();
        expect(screen.getByText("1×")).toBeInTheDocument();
    });

    it("shows searching state while searching", async () => {
        mockSearchBugReports.mockImplementation(() => new Promise(() => {}));
        render(<BugReportDialog {...defaultProps} />);
        fireEvent.change(screen.getByPlaceholderText("searchPlaceholder"), {
            target: { value: "bug" },
        });
        fireEvent.click(screen.getByText("search"));
        expect(screen.getByText("searching")).toBeInTheDocument();
    });

    it("shows error when search fails", async () => {
        mockSearchBugReports.mockRejectedValue(new Error("Network error"));
        render(<BugReportDialog {...defaultProps} />);
        fireEvent.change(screen.getByPlaceholderText("searchPlaceholder"), {
            target: { value: "bug" },
        });
        fireEvent.click(screen.getByText("search"));
        await waitFor(() => {
            expect(screen.getByText(/searchFailed/)).toBeInTheDocument();
        });
    });

    it("does not search when query is empty", () => {
        render(<BugReportDialog {...defaultProps} />);
        fireEvent.click(screen.getByText("search"));
        expect(mockSearchBugReports).not.toHaveBeenCalled();
    });

    it("shows noResults when search returns empty", async () => {
        mockSearchBugReports.mockResolvedValue([]);
        render(<BugReportDialog {...defaultProps} />);
        fireEvent.change(screen.getByPlaceholderText("searchPlaceholder"), {
            target: { value: "xyz" },
        });
        fireEvent.click(screen.getByText("search"));
        await waitFor(() => {
            expect(screen.getByText("noResults")).toBeInTheDocument();
        });
    });

    it("triggers search on Enter key", () => {
        mockSearchBugReports.mockResolvedValue([]);
        render(<BugReportDialog {...defaultProps} />);
        const input = screen.getByPlaceholderText("searchPlaceholder");
        fireEvent.change(input, { target: { value: "enter" } });
        fireEvent.keyDown(input, { key: "Enter" });
        expect(mockSearchBugReports).toHaveBeenCalledWith("enter");
    });

    it("votes for a bug and shows done step", async () => {
        mockSearchBugReports.mockResolvedValue([
            { id: "b1", title: "Bug", description: "Desc", report_count: 1 },
        ]);
        mockVoteBugReport.mockResolvedValue(undefined);
        render(<BugReportDialog {...defaultProps} />);
        fireEvent.change(screen.getByPlaceholderText("searchPlaceholder"), {
            target: { value: "bug" },
        });
        fireEvent.click(screen.getByText("search"));
        await waitFor(() => expect(screen.getByText("Bug")).toBeInTheDocument());
        fireEvent.click(screen.getByText("meToo"));
        await waitFor(() => {
            expect(mockVoteBugReport).toHaveBeenCalledWith("b1");
            expect(screen.getByText("sentTitle")).toBeInTheDocument();
        });
    });

    it("shows error when vote fails", async () => {
        mockSearchBugReports.mockResolvedValue([
            { id: "b1", title: "Bug", description: "Desc", report_count: 1 },
        ]);
        mockVoteBugReport.mockRejectedValue(new Error("Vote error"));
        render(<BugReportDialog {...defaultProps} />);
        fireEvent.change(screen.getByPlaceholderText("searchPlaceholder"), {
            target: { value: "bug" },
        });
        fireEvent.click(screen.getByText("search"));
        await waitFor(() => expect(screen.getByText("Bug")).toBeInTheDocument());
        fireEvent.click(screen.getByText("meToo"));
        await waitFor(() => {
            expect(screen.getByText(/voteFailed/)).toBeInTheDocument();
        });
    });

    it("navigates to create step and submits a new bug", async () => {
        mockCreateBugReport.mockResolvedValue(undefined);
        render(<BugReportDialog {...defaultProps} />);
        fireEvent.click(screen.getByText("createNew"));
        expect(screen.getByPlaceholderText("titlePlaceholder")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("descriptionPlaceholder")).toBeInTheDocument();
        expect(screen.getByText("selectCategory")).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText("titlePlaceholder"), {
            target: { value: "My bug" },
        });
        fireEvent.change(screen.getByPlaceholderText("descriptionPlaceholder"), {
            target: { value: "Description here" },
        });
        fireEvent.change(screen.getByRole("combobox"), {
            target: { value: "UI" },
        });
        fireEvent.click(screen.getByText("submit"));
        await waitFor(() => {
            expect(mockCreateBugReport).toHaveBeenCalledWith(
                "[UI] My bug",
                "Description here",
            );
            expect(screen.getByText("sentTitle")).toBeInTheDocument();
        });
    });

    it("shows error when create fails", async () => {
        mockCreateBugReport.mockRejectedValue(new Error("Create error"));
        render(<BugReportDialog {...defaultProps} />);
        fireEvent.click(screen.getByText("createNew"));
        fireEvent.change(screen.getByPlaceholderText("titlePlaceholder"), {
            target: { value: "My bug" },
        });
        fireEvent.change(screen.getByPlaceholderText("descriptionPlaceholder"), {
            target: { value: "Desc" },
        });
        fireEvent.change(screen.getByRole("combobox"), {
            target: { value: "UI" },
        });
        fireEvent.click(screen.getByText("submit"));
        await waitFor(() => {
            expect(screen.getByText(/failed/)).toBeInTheDocument();
        });
    });

    it("does not submit when fields are empty", () => {
        render(<BugReportDialog {...defaultProps} />);
        fireEvent.click(screen.getByText("createNew"));
        fireEvent.click(screen.getByText("submit"));
        expect(mockCreateBugReport).not.toHaveBeenCalled();
    });

    it("shows sending state while submitting", async () => {
        mockCreateBugReport.mockImplementation(() => new Promise(() => {}));
        render(<BugReportDialog {...defaultProps} />);
        fireEvent.click(screen.getByText("createNew"));
        fireEvent.change(screen.getByPlaceholderText("titlePlaceholder"), {
            target: { value: "Bug" },
        });
        fireEvent.change(screen.getByPlaceholderText("descriptionPlaceholder"), {
            target: { value: "Desc" },
        });
        fireEvent.change(screen.getByRole("combobox"), {
            target: { value: "UI" },
        });
        fireEvent.click(screen.getByText("submit"));
        expect(screen.getByText("sending")).toBeInTheDocument();
    });

    it("goes back from create to search step", () => {
        render(<BugReportDialog {...defaultProps} />);
        fireEvent.click(screen.getByText("createNew"));
        expect(screen.getByPlaceholderText("titlePlaceholder")).toBeInTheDocument();
        fireEvent.click(screen.getByText("back"));
        expect(screen.getByText("searchPrompt")).toBeInTheDocument();
    });

    it("closes dialog from done step", async () => {
        const onClose = vi.fn();
        mockSearchBugReports.mockResolvedValue([
            { id: "b1", title: "Bug", description: "Desc", report_count: 1 },
        ]);
        mockVoteBugReport.mockResolvedValue(undefined);
        render(<BugReportDialog {...defaultProps} onClose={onClose} />);
        // Go through vote flow to reach done step
        fireEvent.change(screen.getByPlaceholderText("searchPlaceholder"), {
            target: { value: "bug" },
        });
        fireEvent.click(screen.getByText("search"));
        await waitFor(() => expect(screen.getByText("Bug")).toBeInTheDocument());
        fireEvent.click(screen.getByText("meToo"));
        await waitFor(() => {
            expect(screen.getByText("sentTitle")).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText("close"));
        expect(onClose).toHaveBeenCalled();
    });
});