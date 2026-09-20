import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AnnotationDialog from "../AnnotationDialog";

const mockOnClose = vi.fn();
const mockOnSuccess = vi.fn();
const mockAddAnnotation = vi.fn();

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

vi.mock("../../shared/api", () => ({
  api: {
    addAnnotation: (...args: any[]) => mockAddAnnotation(...args),
  },
}));

const baseProps = {
  open: true,
  pdfId: "p1",
  currentPage: 2,
  onClose: mockOnClose,
  onSuccess: mockOnSuccess,
};

describe("AnnotationDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title and type selector", () => {
    render(<AnnotationDialog {...baseProps} />);
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByTestId("annotation-type")).toBeInTheDocument();
  });

  it("saves annotation and calls onSuccess + onClose", async () => {
    mockAddAnnotation.mockResolvedValue({ id: "p1" });
    render(<AnnotationDialog {...baseProps} />);
    fireEvent.click(screen.getByTestId("annotation-save"));
    await waitFor(() => expect(mockAddAnnotation).toHaveBeenCalled());
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("shows error on failure", async () => {
    mockAddAnnotation.mockRejectedValue(new Error("fail"));
    render(<AnnotationDialog {...baseProps} />);
    fireEvent.click(screen.getByTestId("annotation-save"));
    await waitFor(() => expect(screen.getByTestId("annotation-error")).toBeInTheDocument());
  });

  it("returns null when closed", () => {
    render(<AnnotationDialog {...baseProps} open={false} />);
    expect(screen.queryByTestId("annotation-type")).not.toBeInTheDocument();
  });
});