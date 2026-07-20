import { describe, expect, it } from "vitest";
import type { Ore } from "@/features/ores/ores.schema";
import type { SignatureProfile } from "./signature-profiles.schema";
import {
  buildChartRows,
  chartAxisMax,
  matchScanValue,
  parseScanQuery,
  type ChartRow,
} from "./signature-chart.model";

function ore(code: string, name: string, rarityTier: Ore["rarityTier"]): Ore {
  return {
    code,
    name_de: name,
    name_en: name,
    rarityTier,
    mineableBy: { ship: true, roc: false, fps: false },
  };
}

function shipProfile(
  oreCode: string,
  signatureValue: number,
  extra: Partial<SignatureProfile> = {},
): SignatureProfile {
  return {
    oreCode,
    method: "ship",
    signatureValue,
    patchVersion: "4.7",
    sourceType: "curated",
    confidenceScore: 0.6,
    ...extra,
  };
}

const ORES: Ore[] = [
  ore("QUAN", "Quantainium", "legendary"),
  ore("BEXA", "Bexalite", "uncommon"),
  ore("ICE", "Ice", "common"),
];

const PROFILES: SignatureProfile[] = [
  shipProfile("ICE", 4300),
  shipProfile("QUAN", 3170, {
    dominantCompositionRange: { min: 40, max: 80 },
    notes: "+ Beryl (10-20%)",
  }),
  shipProfile("BEXA", 3600),
  // Ground profile must NOT create its own per-mineral chart row.
  {
    oreCode: "HADA",
    method: "roc",
    signatureValue: 4000,
    patchVersion: "4.7",
    sourceType: "curated",
    confidenceScore: 0.6,
  },
];

describe("buildChartRows", () => {
  it("sorts ship rows ascending by base signature and resolves ore metadata", () => {
    const rows = buildChartRows(PROFILES, ORES);
    const ship = rows.filter((r) => r.kind === "ship");

    expect(ship.map((r) => r.oreCode)).toEqual(["QUAN", "BEXA", "ICE"]);
    expect(ship[0]).toMatchObject({
      oreName: "Quantainium",
      rarityTier: "legendary",
      baseValue: 3170,
      dominantCompositionRange: { min: 40, max: 80 },
      notes: "+ Beryl (10-20%)",
    });
  });

  it("staggers the cluster depth by rarity (legendary 2 … common 6)", () => {
    const rows = buildChartRows(PROFILES, ORES);
    const byCode = new Map(
      rows.filter((r) => r.kind === "ship").map((r) => [r.oreCode, r]),
    );

    expect(byCode.get("QUAN")!.nodes.map((n) => n.value)).toEqual([3170, 6340]);
    expect(byCode.get("BEXA")!.nodes.map((n) => n.value)).toEqual([
      3600, 7200, 10800, 14400, 18000,
    ]);
    expect(byCode.get("ICE")!.nodes).toHaveLength(6);
    expect(byCode.get("ICE")!.nodes.at(-1)!.value).toBe(25800);
  });

  it("appends generic ROC and FPS ground tracks and ignores per-mineral ground profiles", () => {
    const rows = buildChartRows(PROFILES, ORES);
    const ground = rows.filter((r) => r.kind === "ground");

    // No HADA row — ground minerals are not identified by signature.
    expect(rows.some((r) => r.kind === "ship" && r.oreCode === "HADA")).toBe(
      false,
    );
    expect(ground.map((r) => r.track)).toEqual(["roc", "fps"]);

    const roc = ground.find((r) => r.track === "roc")!;
    expect(roc.baseValue).toBe(4000);
    expect(roc.nodes).toHaveLength(7);
    expect(roc.nodes.at(-1)!.value).toBe(28000);

    const fps = ground.find((r) => r.track === "fps")!;
    expect(fps.baseValue).toBe(3000);
    expect(fps.nodes.at(-1)!.value).toBe(21000);
  });
});

describe("chartAxisMax", () => {
  it("returns the largest node value across all rows", () => {
    const rows = buildChartRows(PROFILES, ORES);
    // Ground ROC ×7 = 28000 is the widest reach.
    expect(chartAxisMax(rows)).toBe(28000);
  });

  it("returns 0 for an empty chart", () => {
    expect(chartAxisMax([])).toBe(0);
  });
});

describe("parseScanQuery", () => {
  it("parses an exact integer", () => {
    expect(parseScanQuery("18000")).toEqual({ kind: "exact", value: 18000 });
  });

  it("parses a ~tolerance query", () => {
    expect(parseScanQuery("~7200")).toEqual({
      kind: "tolerance",
      value: 7200,
    });
  });

  it("parses a min-max range and normalises reversed bounds", () => {
    expect(parseScanQuery("12000-20000")).toEqual({
      kind: "range",
      min: 12000,
      max: 20000,
    });
    expect(parseScanQuery("20000-12000")).toEqual({
      kind: "range",
      min: 12000,
      max: 20000,
    });
  });

  it("returns null for empty or nonsense input", () => {
    expect(parseScanQuery("")).toBeNull();
    expect(parseScanQuery("   ")).toBeNull();
    expect(parseScanQuery("abc")).toBeNull();
  });
});

describe("matchScanValue", () => {
  const rows: ChartRow[] = buildChartRows(PROFILES, ORES);

  it("finds the exact cluster step (ore × count) for a scanned value", () => {
    const matches = matchScanValue({ kind: "exact", value: 18000 }, rows);
    expect(matches).toContainEqual({ rowKey: "BEXA", count: 5, value: 18000 });
  });

  it("matches within ±10% for a ~tolerance query", () => {
    // Bexalite ×2 = 7200; 7000 is within 10% of 7000's target? query value 7000
    const matches = matchScanValue({ kind: "tolerance", value: 7000 }, rows);
    expect(matches.some((m) => m.rowKey === "BEXA" && m.count === 2)).toBe(
      true,
    );
  });

  it("matches every node inside a range query", () => {
    const matches = matchScanValue(
      { kind: "range", min: 12000, max: 16000 },
      rows,
    );
    expect(matches.some((m) => m.rowKey === "BEXA" && m.count === 4)).toBe(
      true,
    );
  });

  it("returns nothing when no cluster step matches", () => {
    expect(matchScanValue({ kind: "exact", value: 999 }, rows)).toEqual([]);
  });
});
