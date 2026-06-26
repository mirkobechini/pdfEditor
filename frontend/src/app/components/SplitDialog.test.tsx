import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SplitDialog, { parsePageRanges } from "./SplitDialog";
import { api } from "../lib/api";

// Mock i18n
vi.mock("../lib/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "it" as const,
    setLocale: vi.fn(),
  }),
}));

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

describe("parsePageRanges", () => {
  it("parses single pages", () => {
    expect(parsePageRanges("1, 3, 5", 10)).toEqual([1, 3, 5]);
  });

  it("parses ranges", () => {
    expect(parsePageRanges("1-3", 10)).toEqual([1, 2, 3]);
  });

  it("parses mixed single pages and ranges", () => {
    expect(parsePageRanges("1-3, 5, 7", 10)).toEqual([1, 2, 3, 5, 7]);
  });

  it("clamps to max pages", () => {
    expect(parsePageRanges("1-20", 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("ignores invalid input", () => {
    expect(parsePageRanges("", 10)).toEqual([]);
    expect(parsePageRanges("abc", 10)).toEqual([]);
  });

  it("clamps to minimum page 1", () => {
    expect(parsePageRanges("0-3", 10)).toEqual([1, 2, 3]);
  });
});

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
      <SplitDialog open={false} onClose={() => {}} selectedId="1" selectedName="test.pdf" totalPages={5} />
    );
    expect(screen.queryByText("splitDialog.title")).not.toBeInTheDocument();
  });

  it("renders dialog with file info when open is true", () => {
    (api.downloadPdf as any).mockImplementation(() => new Promise(() => {}));

    render(
      <SplitDialog open={true} onClose={() => {}} selectedId="1" selectedName="test.pdf" totalPages={5} />
    );

    expect(screen.getByText("splitDialog.title")).toBeInTheDocument();
    expect(screen.getByText(/test\.pdf/)).toBeInTheDocument();
  });

  it("shows loading spinner while loading thumbnails", () => {
    (api.downloadPdf as any).mockImplementation(() => new Promise(() => {}));

    render(
      <SplitDialog open={true} onClose={() => {}} selectedId="1" selectedName="test.pdf" totalPages={5} />
    );

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("disables Split button when no pages selected", () => {
    (api.downloadPdf as any).mockImplementation(() => new Promise(() => {}));

    render(
      <SplitDialog open={true} onClose={() => {}} selectedId="1" selectedName="test.pdf" totalPages={5} />
    );

    const splitBtn = screen.getByText("splitDialog.split");
    expect(splitBtn).toBeDisabled();
  });
});
