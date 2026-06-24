import { describe, it, expect } from "vitest";

function moveUp(order: number[], index: number): number[] {
  if (index === 0) return order;
  const next = [...order];
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  return next;
}

function moveDown(order: number[], index: number): number[] {
  if (index === order.length - 1) return order;
  const next = [...order];
  [next[index], next[index + 1]] = [next[index + 1], next[index]];
  return next;
}

function isOrderChanged(order: number[]): boolean {
  return order.some((pageIdx, pos) => pageIdx !== pos);
}

describe("ReorderDialog logic", () => {
  it("moves a page up", () => {
    const order = [0, 1, 2, 3];
    expect(moveUp(order, 2)).toEqual([0, 2, 1, 3]);
  });

  it("does not move first page up", () => {
    const order = [0, 1, 2];
    expect(moveUp(order, 0)).toEqual([0, 1, 2]);
  });

  it("moves a page down", () => {
    const order = [0, 1, 2, 3];
    expect(moveDown(order, 1)).toEqual([0, 2, 1, 3]);
  });

  it("does not move last page down", () => {
    const order = [0, 1, 2];
    expect(moveDown(order, 2)).toEqual([0, 1, 2]);
  });

  it("detects when order changed", () => {
    expect(isOrderChanged([0, 2, 1])).toBe(true);
  });

  it("detects when order unchanged", () => {
    expect(isOrderChanged([0, 1, 2])).toBe(false);
  });
});