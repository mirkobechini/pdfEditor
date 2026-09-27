import { ptPerPx, pxToPt, clampBoxPosition, clampBoxSize } from "../src/components/positionMath";

describe("ptPerPx", () => {
  it("computes points-per-pixel for each axis from page size and preview dimensions", () => {
    const scale = ptPerPx({ width: 600, height: 300 }, 300, 150);
    expect(scale).toEqual({ x: 2, y: 2 });
  });

  it("handles non-uniform scaling between axes", () => {
    const scale = ptPerPx({ width: 400, height: 800 }, 200, 200);
    expect(scale).toEqual({ x: 2, y: 4 });
  });
});

describe("pxToPt", () => {
  it("converts a pixel point to PDF points and rounds to the nearest integer", () => {
    const pt = pxToPt({ x: 30, y: 15 }, { width: 600, height: 300 }, 300, 150);
    expect(pt).toEqual({ x: 60, y: 30 });
  });

  it("rounds fractional results", () => {
    const pt = pxToPt({ x: 10, y: 10 }, { width: 100, height: 100 }, 33, 33);
    // scale = 100/33 ≈ 3.0303 → 10 * 3.0303 ≈ 30.303 → rounds to 30
    expect(pt).toEqual({ x: 30, y: 30 });
  });
});

describe("clampBoxPosition", () => {
  it("moves the box by the drag delta when within bounds", () => {
    const pos = clampBoxPosition({ x: 10, y: 10 }, 20, 5, { width: 50, height: 30 }, 300, 200);
    expect(pos).toEqual({ x: 30, y: 15 });
  });

  it("clamps to the left/top edge", () => {
    const pos = clampBoxPosition({ x: 10, y: 10 }, -50, -50, { width: 50, height: 30 }, 300, 200);
    expect(pos).toEqual({ x: 0, y: 0 });
  });

  it("clamps to the right/bottom edge based on box size", () => {
    const pos = clampBoxPosition({ x: 10, y: 10 }, 1000, 1000, { width: 50, height: 30 }, 300, 200);
    expect(pos).toEqual({ x: 250, y: 170 }); // 300-50, 200-30
  });
});

describe("clampBoxSize", () => {
  it("grows the box by the resize delta when within bounds", () => {
    const size = clampBoxSize({ width: 100, height: 60 }, 20, 10, { x: 0, y: 0 }, 300, 200);
    expect(size).toEqual({ width: 120, height: 70 });
  });

  it("never shrinks below the minimum size", () => {
    const size = clampBoxSize({ width: 100, height: 60 }, -1000, -1000, { x: 0, y: 0 }, 300, 200);
    expect(size).toEqual({ width: 40, height: 20 }); // default minWidth/minHeight
  });

  it("respects custom minimum sizes", () => {
    const size = clampBoxSize({ width: 100, height: 60 }, -1000, -1000, { x: 0, y: 0 }, 300, 200, 10, 10);
    expect(size).toEqual({ width: 10, height: 10 });
  });

  it("clamps growth to the remaining space based on the box's position", () => {
    // Box is at x=250 in a 300-wide preview — only 50px of room to grow width.
    const size = clampBoxSize({ width: 100, height: 60 }, 1000, 1000, { x: 250, y: 150 }, 300, 200);
    expect(size).toEqual({ width: 50, height: 50 });
  });
});
