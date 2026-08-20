import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PdfViewer from "../PdfViewer";

(window as any).pdfjsLib = undefined;

describe("PdfViewer", () => {
  const defaultProps = {
    fileUrl: null,
    currentPage: 1,
    totalPages: 0,
    onPageChange: vi.fn(),
    onTotalPagesChange: vi.fn(),
    zoom: 1,
    onZoomChange: vi.fn(),
  };

  it("renders placeholder when no fileUrl", () => {
    render(<PdfViewer {...defaultProps} />);
    expect(screen.getByText("Seleziona un PDF per visualizzarlo")).toBeInTheDocument();
  });

  it("renders canvas when fileUrl is provided", () => {
    render(<PdfViewer {...defaultProps} fileUrl="blob:test" />);
    const canvas = document.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
  });
});
