import { describe, it, expect } from "vitest";

function getRemainingPages(pageCount: number, toRemove: Set<number>): number[] {
  return Array.from({ length: pageCount }, (_, i) => i).filter(
    (i) => !toRemove.has(i)
  );
}

describe("RemoveDialog logic", () => {
  it("removes selected pages", () => {
    const result = getRemainingPages(5, new Set([0, 2]));
    expect(result).toEqual([1, 3, 4]);
  });

  it("keeps all pages when none selected", () => {
    const result = getRemainingPages(5, new Set());
    expect(result).toEqual([0, 1, 2, 3, 4]);
  });

  it("removes all pages except one", () => {
    const result = getRemainingPages(5, new Set([0, 1, 2, 3]));
    expect(result).toEqual([4]);
  });

  it("handles empty document", () => {
    const result = getRemainingPages(0, new Set());
    expect(result).toEqual([]);
  });
});