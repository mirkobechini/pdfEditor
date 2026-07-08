import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ReorderDialog from "./ReorderDialog";
import { api } from "../lib/api";

// Mock api
vi.mock("../lib/api", () => ({
  api: {
    downloadPdf: vi.fn(),
    reorderPages: vi.fn(),
  },
}));

// Mock download
vi.mock("../lib/download", () => ({
  downloadBlob: vi.fn(),
}));

describe("ReorderDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate PDF.js already loaded (jsdom doesn't load scripts)
    (window as any).pdfjsLib = {
      GlobalWorkerOptions: { workerSrc: "" },
      getDocument: vi.fn(),
    };
  });

  it("renders nothing when open is false", () => {
    render(
      <ReorderDialog open={false} onClose={() => { }} selectedId="1" selectedName="test.pdf" totalPages={5} />
    );
    expect(screen.queryByText("title")).not.toBeInTheDocument();
  });

  it("renders dialog with file info when open is true", () => {
    (api.downloadPdf as any).mockImplementation(() => new Promise(() => { }));

    render(
      <ReorderDialog open={true} onClose={() => { }} selectedId="1" selectedName="test.pdf" totalPages={5} />
    );

    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText(/test\.pdf/)).toBeInTheDocument();
  });

  it("shows loading spinner while loading thumbnails", () => {
    (api.downloadPdf as any).mockImplementation(() => new Promise(() => { }));

    render(
      <ReorderDialog open={true} onClose={() => { }} selectedId="1" selectedName="test.pdf" totalPages={5} />
    );

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("disables Reorder button when order is unchanged", () => {
    (api.downloadPdf as any).mockImplementation(() => new Promise(() => { }));

    render(
      <ReorderDialog open={true} onClose={() => { }} selectedId="1" selectedName="test.pdf" totalPages={5} />
    );

    const reorderBtn = screen.getByText("reorder");
    expect(reorderBtn).toBeDisabled();
  });

  it("shows error message when thumbnails fail to load", async () => {
    (api.downloadPdf as any).mockRejectedValue(new Error("Failed"));

    render(
      <ReorderDialog open={true} onClose={() => { }} selectedId="1" selectedName="test.pdf" totalPages={5} />
    );

    const errorText = await screen.findByText(/failed/);
    expect(errorText).toBeInTheDocument();
  });
});
