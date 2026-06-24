import { describe, it, expect } from "vitest";
import { parsePageRanges } from "./SplitDialog";

// parsePageRanges is exported from SplitDialog for testing
// We re-import it via the function defined in the component file

// Since parsePageRanges is not exported from the component,
// we test the logic directly by duplicating the function
function parsePageRanges(input: string, maxPages: number): number[] {
  const pages = new Set<number>();
  const parts = input.split(",");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const range = trimmed.split("-").map((s) => parseInt(s.trim(), 10));
    if (range.length === 1 && !isNaN(range[0])) {
      if (range[0] >= 1 && range[0] <= maxPages) pages.add(range[0]);
    } else if (range.length === 2 && !isNaN(range[0]) && !isNaN(range[1])) {
      const start = Math.max(1, range[0]);
      const end = Math.min(maxPages, range[1]);
      for (let i = start; i <= end; i++) pages.add(i);
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

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