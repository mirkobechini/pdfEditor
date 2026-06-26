import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PdfViewer from "./PdfViewer";
import { useI18n } from "../lib/i18n";

// Mock i18n
vi.mock("../lib/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "it" as const,
    setLocale: vi.fn(),
  }),
}));

describe("PdfViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).pdfjsLib = {
      GlobalWorkerOptions: { workerSrc: "" },
      getDocument: vi.fn(),
    };
  });

  it("shows empty state when no fileUrl", () => {
    render(
      <PdfViewer
        fileUrl={null}
        currentPage={1}
        totalPages={0}
        onPageChange={() => {}}
        onTotalPagesChange={() => {}}
        zoom={1}
        onZoomChange={() => {}}
      />
    );
    expect(screen.getByText("app.selectPdf")).toBeInTheDocument();
    expect(screen.getByText("app.dragAndDrop")).toBeInTheDocument();
  });

  it("shows visual feedback on drag over empty state", () => {
    render(
      <PdfViewer
        fileUrl={null}
        currentPage={1}
        totalPages={0}
        onPageChange={() => {}}
        onTotalPagesChange={() => {}}
        zoom={1}
        onZoomChange={() => {}}
      />
    );

    const dropZone = screen.getByText("app.selectPdf").closest("div")!;
    fireEvent.dragOver(dropZone);

    // After drag over, the icon should change to 📥
    expect(screen.getByText("app.dropToUpload")).toBeInTheDocument();
  });

  it("calls onFileDrop when PDF is dropped on empty state", () => {
    const onFileDrop = vi.fn();
    render(
      <PdfViewer
        fileUrl={null}
        currentPage={1}
        totalPages={0}
        onPageChange={() => {}}
        onTotalPagesChange={() => {}}
        zoom={1}
        onZoomChange={() => {}}
        onFileDrop={onFileDrop}
      />
    );

    const dropZone = screen.getByText("app.selectPdf").closest("div")!;
    const file = new File(["test"], "test.pdf", { type: "application/pdf" });
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(onFileDrop).toHaveBeenCalledWith(file);
  });

  it("does not call onFileDrop for non-PDF files", () => {
    const onFileDrop = vi.fn();
    render(
      <PdfViewer
        fileUrl={null}
        currentPage={1}
        totalPages={0}
        onPageChange={() => {}}
        onTotalPagesChange={() => {}}
        zoom={1}
        onZoomChange={() => {}}
        onFileDrop={onFileDrop}
      />
    );

    const dropZone = screen.getByText("app.selectPdf").closest("div")!;
    const file = new File(["test"], "test.txt", { type: "text/plain" });
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(onFileDrop).not.toHaveBeenCalled();
  });
});