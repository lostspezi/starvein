import { describe, expect, it } from "vitest";
import {
  clusterDepthForRarity,
  CLUSTER_COUNTS,
  signatureClusters,
} from "./signature-cluster";

describe("signatureClusters", () => {
  it("covers 1× through 4× rock/deposit counts", () => {
    expect(CLUSTER_COUNTS).toEqual([1, 2, 3, 4]);
  });

  it("scales a single signature value by the rock count", () => {
    const clusters = signatureClusters({ signatureValue: 3600 });

    expect(clusters).toEqual([
      { count: 1, value: 3600 },
      { count: 2, value: 7200 },
      { count: 3, value: 10800 },
      { count: 4, value: 14400 },
    ]);
  });

  it("scales both ends of a signature range by the deposit count", () => {
    const clusters = signatureClusters({
      signatureRange: { min: 3000, max: 4000 },
    });

    expect(clusters).toEqual([
      { count: 1, range: { min: 3000, max: 4000 } },
      { count: 2, range: { min: 6000, max: 8000 } },
      { count: 3, range: { min: 9000, max: 12000 } },
      { count: 4, range: { min: 12000, max: 16000 } },
    ]);
  });

  it("returns nothing when neither value nor range is known", () => {
    expect(signatureClusters({})).toEqual([]);
  });

  it("extends the cluster depth when maxCount is given", () => {
    const clusters = signatureClusters({ signatureValue: 4300 }, 6);

    expect(clusters.map((c) => c.value)).toEqual([
      4300, 8600, 12900, 17200, 21500, 25800,
    ]);
  });
});

describe("clusterDepthForRarity", () => {
  it("gives rarer minerals fewer cluster steps than common ones", () => {
    expect(clusterDepthForRarity("legendary")).toBe(2);
    expect(clusterDepthForRarity("epic")).toBe(3);
    expect(clusterDepthForRarity("rare")).toBe(4);
    expect(clusterDepthForRarity("uncommon")).toBe(5);
    expect(clusterDepthForRarity("common")).toBe(6);
  });
});
