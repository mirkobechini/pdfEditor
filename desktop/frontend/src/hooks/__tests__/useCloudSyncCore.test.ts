/**
 * Unit tests for the cloud-deletion detection helpers (#990).
 *
 * A local PDF with a sync mapping whose cloud id is no longer in the cloud was
 * deleted on the web (which owns the cloud). We must NOT re-upload it, and we
 * only ask the user when the cloud list was read COMPLETELY.
 */
import { describe, it, expect } from "vitest";
import {
  isCloudListComplete,
  computeCloudDeletions,
  getExcludedIds,
  isExcluded,
  setExcluded,
} from "../useCloudSyncCore";

describe("isCloudListComplete", () => {
  it("è completo quando riceviamo tutti gli item del total", () => {
    expect(isCloudListComplete([{ id: "a" }, { id: "b" }], 2)).toBe(true);
  });

  it("NON è completo se il total è maggiore degli item ricevuti (lista troncata)", () => {
    expect(isCloudListComplete([{ id: "a" }], 2)).toBe(false);
  });

  it("NON è completo se manca il total (lista pericolosa)", () => {
    expect(isCloudListComplete([{ id: "a" }], undefined)).toBe(false);
  });
});

describe("computeCloudDeletions", () => {
  const local = [
    { id: "l1", original_filename: "a.pdf" },
    { id: "l2", original_filename: "b.pdf" },
    { id: "l3", original_filename: "c.pdf" },
  ];

  it("rileva i PDF con mapping il cui cloudId non esiste più", () => {
    const cloudIds = new Set(["c2"]); // c1 e c3 spariti dal cloud
    const map = { l1: "c1", l2: "c2", l3: "c3" };
    const out = computeCloudDeletions(local, cloudIds, map, true);
    expect(out.map((d) => d.localId).sort()).toEqual(["l1", "l3"]);
    expect(out.find((d) => d.localId === "l1")?.name).toBe("a.pdf");
  });

  it("NON propone nulla se la lista cloud è incompleta", () => {
    const cloudIds = new Set<string>(); // lista vuota/troncata
    const map = { l1: "c1", l2: "c2", l3: "c3" };
    expect(computeCloudDeletions(local, cloudIds, map, false)).toEqual([]);
  });

  it("ignora i PDF mai sincronizzati (senza mapping)", () => {
    const cloudIds = new Set<string>();
    const map: Record<string, string> = {};
    expect(computeCloudDeletions(local, cloudIds, map, true)).toEqual([]);
  });

  it("ignora i PDF il cui cloud esiste ancora", () => {
    const cloudIds = new Set(["c1", "c2", "c3"]);
    const map = { l1: "c1", l2: "c2", l3: "c3" };
    expect(computeCloudDeletions(local, cloudIds, map, true)).toEqual([]);
  });
});

describe("esclusione per file (#990)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("parte vuota", () => {
    expect(getExcludedIds()).toEqual([]);
    expect(isExcluded("l1")).toBe(false);
  });

  it("esclude e reinclude un file", () => {
    setExcluded("l1", true);
    expect(isExcluded("l1")).toBe(true);
    setExcluded("l1", false);
    expect(isExcluded("l1")).toBe(false);
  });

  it("gestisce più file senza duplicati", () => {
    setExcluded("l1", true);
    setExcluded("l1", true);
    setExcluded("l2", true);
    expect(getExcludedIds().sort()).toEqual(["l1", "l2"]);
  });
});
