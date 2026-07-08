import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SplitDialog from "./SplitDialog";
import { api } from "../lib/api";

// Mock api
vi.mock("../lib/api", () => ({
  api: {
    downloadPdf: vi.fn(),
    splitPdf: vi.fn(),
  },
}));

// Mock download
vi.mock("../lib/download", () => ({
  downloadBlob: vi.fn(),
}));

describe("SplitDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).pdfjsLib = {
      GlobalWorkerOptions: { workerSrc: "" },
      getDocument: vi.fn(),
    };
  });

  it("renders nothing when open is false", () => {
    render(
      <SplitDialog open={false} onClose={() => { }} selectedId="1" selectedName="test.pdf" totalPages={5} />
    );
    expect(screen.queryByText("title")).not.toBeInTheDocument();
  });

  it("renders dialog with file info when open is true", () => {
    (api.downloadPdf as any).mockImplementation(() => new Promise(() => { }));

    render(
      <SplitDialog open={true} onClose={() => { }} selectedId="1" selectedName="test.pdf" totalPages={5} />
    );

    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText(/test\.pdf/)).toBeInTheDocument();
  });

  it("shows loading spinner while loading thumbnails", () => {
    (api.downloadPdf as any).mockImplementation(() => new Promise(() => { }));

    render(
      <SplitDialog open={true} onClose={() => { }} selectedId="1" selectedName="test.pdf" totalPages={5} />
    );

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("shows hint text when no cuts added", () => {
    (api.downloadPdf as any).mockResolvedValue(new Blob());

    render(
      <SplitDialog open={true} onClose={() => { }} selectedId="1" selectedName="test.pdf" totalPages={5} />
    );

    expect(screen.getByText("split")).toBeInTheDocument();
  });
});
