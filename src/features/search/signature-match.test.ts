import { describe, expect, it } from "vitest";
import {
  matchSignatureValue,
  parseSignatureQuery,
  type GroundSignatureEntry,
  type ShipSignatureEntry,
} from "./signature-match";

const SHIP: ShipSignatureEntry[] = [
  { oreCode: "QUAN", oreName: "Quantainium", signatureValue: 3170 },
  { oreCode: "STIL", oreName: "Stileron", signatureValue: 3185 },
  { oreCode: "SAVR", oreName: "Savrilium", signatureValue: 3200 },
  { oreCode: "BEXA", oreName: "Bexalite", signatureValue: 3600 },
  { oreCode: "ALUM", oreName: "Aluminum", signatureValue: 4285 },
];

const GROUND: GroundSignatureEntry[] = [
  { method: "fps", signatureValue: 3000 },
  { method: "roc", signatureValue: 4000 },
];

describe("parseSignatureQuery", () => {
  it("parses plain numbers", () => {
    expect(parseSignatureQuery("18000")).toBe(18000);
  });

  it("ignores thousand separators and whitespace", () => {
    expect(parseSignatureQuery("18.000")).toBe(18000);
    expect(parseSignatureQuery("18,000")).toBe(18000);
    expect(parseSignatureQuery(" 6 340 ")).toBe(6340);
  });

  it("rejects non-numeric queries", () => {
    expect(parseSignatureQuery("Quantainium")).toBeNull();
    expect(parseSignatureQuery("s1 laser")).toBeNull();
    expect(parseSignatureQuery("")).toBeNull();
  });

  it("rejects values too small for any scanner reading", () => {
    expect(parseSignatureQuery("45")).toBeNull();
  });
});

describe("matchSignatureValue", () => {
  /**
   * Ein exakter Erz-Treffer ist eindeutig (Basis-Signaturen sind pro
   * Mineral einmalig) — Näherungsvorschläge wären nur Rauschen.
   */
  it("returns only the exact match when an ore matches exactly", () => {
    const matches = matchSignatureValue(3170, SHIP, GROUND);
    expect(matches).toEqual([
      {
        type: "ore",
        count: 1,
        signatureValue: 3170,
        oreCode: "QUAN",
        oreName: "Quantainium",
        exact: true,
      },
    ]);
  });

  /**
   * Näherungssuche: ein grober Wert wie 3000 schlägt alle Minerale in
   * ±10% Toleranz vor — exakte Treffer zuerst, dann nach Abweichung.
   */
  it("suggests nearby minerals within tolerance", () => {
    const matches = matchSignatureValue(3000, SHIP, GROUND);

    expect(matches[0]).toMatchObject({
      type: "ground",
      method: "fps",
      count: 1,
      exact: true,
    });
    expect(matches.slice(1)).toEqual([
      expect.objectContaining({ oreCode: "QUAN", count: 1, exact: false }),
      expect.objectContaining({ oreCode: "STIL", count: 1, exact: false }),
      expect.objectContaining({ oreCode: "SAVR", count: 1, exact: false }),
    ]);
  });

  it("matches cluster sums as base × rock count", () => {
    // 18.000 = 5 × Bexalite 3.600 — Referenzbeispiel der Community-Tools
    const matches = matchSignatureValue(18000, SHIP, GROUND);
    // exakter Erz-Treffer -> nur exakte Treffer, keine Näherungsvorschläge
    expect(matches).toEqual([
      expect.objectContaining({
        type: "ore",
        count: 5,
        oreCode: "BEXA",
        exact: true,
      }),
      expect.objectContaining({
        type: "ground",
        method: "fps",
        count: 6,
        exact: true,
      }),
    ]);
  });

  it("ranks exact ground sums before fuzzy ore suggestions", () => {
    const matches = matchSignatureValue(12000, SHIP, GROUND);
    // kleinste Cluster zuerst bei gleicher Abweichung: 3 × ROC vor 4 × FPS
    expect(matches[0]).toMatchObject({ method: "roc", count: 3, exact: true });
    expect(matches[1]).toMatchObject({ method: "fps", count: 4, exact: true });
    // danach Näherungstreffer (z. B. 4 × Quantainium = 12.680)
    expect(matches[2]).toMatchObject({ oreCode: "QUAN", exact: false });
  });

  it("suggests only the closest cluster size per mineral", () => {
    // 20.600 liegt zwischen 6 × und 7 × Quantainium — nur der nähere Treffer
    const matches = matchSignatureValue(20600, SHIP, GROUND);
    const quan = matches.filter(
      (m) => m.type === "ore" && m.oreCode === "QUAN",
    );
    expect(quan).toHaveLength(1);
  });

  it("caps the cluster size at 10 rocks", () => {
    expect(matchSignatureValue(50000, SHIP, GROUND)).toEqual([]);
  });

  it("returns nothing when no value is within tolerance", () => {
    expect(matchSignatureValue(5000, SHIP, GROUND)).toEqual([]);
  });
});
