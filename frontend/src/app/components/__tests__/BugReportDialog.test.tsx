import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import BugReportDialog from "../BugReportDialog";

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock("../../lib/api", () => ({
    api: { createBugReport: vi.fn() },
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
});