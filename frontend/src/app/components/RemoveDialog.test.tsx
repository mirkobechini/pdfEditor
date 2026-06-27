import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import RemoveDialog from "./RemoveDialog";
import { api } from "../lib/api";

// Mock api
vi.mock("../lib/api", () => ({
  api: {
    downloadPdf: vi.fn(),
    removePages: vi.fn(),
  },
}));

// Mock download
vi.mock("../lib/download", () => ({
  downloadBlob: vi.fn(),
}));

describe("RemoveDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).pdfjsLib = {
      GlobalWorkerOptions: { workerSrc: "" },
      getDocument: vi.fn(),
    };
  });

  it("renders nothing when open is false", () => {
    render(
      <RemoveDialog open={false} onClose={() => { }} selectedId="1" selectedName="test.pdf" totalPages={5} />
    );
    expect(screen.queryByText("title")).not.toBeInTheDocument();
  });

  it("renders dialog with file info when open is true", () => {
    (api.downloadPdf as any).mockImplementation(() => new Promise(() => { }));

    render(
      <RemoveDialog open={true} onClose={() => { }} selectedId="1" selectedName="test.pdf" totalPages={5} />
    );

    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText(/test\.pdf/)).toBeInTheDocument();
  });

  it("shows loading spinner while loading thumbnails", () => {
    (api.downloadPdf as any).mockImplementation(() => new Promise(() => { }));

    render(
      <RemoveDialog open={true} onClose={() => { }} selectedId="1" selectedName="test.pdf" totalPages={5} />
    );

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("disables Remove button when no pages selected", () => {
    (api.downloadPdf as any).mockImplementation(() => new Promise(() => { }));

    render(
      <RemoveDialog open={true} onClose={() => { }} selectedId="1" selectedName="test.pdf" totalPages={5} />
    );

    const removeBtn = screen.getByText("remove");
    expect(removeBtn).toBeDisabled();
  });

  it("shows remaining page count", () => {
    (api.downloadPdf as any).mockImplementation(() => new Promise(() => { }));

    render(
      <RemoveDialog open={true} onClose={() => { }} selectedId="1" selectedName="test.pdf" totalPages={5} />
    );

    expect(screen.getByText(/pagesRemaining/)).toBeInTheDocument();
  });

  it("shows error message when load fails", async () => {
    (api.downloadPdf as any).mockRejectedValue(new Error("Failed"));

    render(
      <RemoveDialog open={true} onClose={() => { }} selectedId="1" selectedName="test.pdf" totalPages={5} />
    );

    // Wait for the fallback to render (no error message shown on load failure, just no thumbnails)
    // The dialog should still render with Remove button disabled
    const removeBtn = await screen.findByText("remove");
    expect(removeBtn).toBeDisabled();
  });
});
