import { describe, expect, it } from "vitest";
import { loadCuratedOreCodes } from "./curated-ore-codes";

describe("curated ore-codes mapping", () => {
  it("loads and validates all mapping entries", () => {
    // 26 Ship-Erze + 11 ROC/FPS-Minerale
    expect(loadCuratedOreCodes().length).toBe(37);
  });

  it("has unique codes and unique wiki keys", () => {
    const entries = loadCuratedOreCodes();
    expect(new Set(entries.map((e) => e.code)).size).toBe(entries.length);
    expect(new Set(entries.map((e) => e.wikiKey)).size).toBe(entries.length);
  });

  it("maps the inconsistent wiki key prefixes", () => {
    const byCode = new Map(loadCuratedOreCodes().map((e) => [e.code, e]));
    expect(byCode.get("QUAN")?.wikiKey).toBe("Raw_Quantainium");
    expect(byCode.get("AGRI")?.wikiKey).toBe("Ore_Agricium");
    expect(byCode.get("OURA")?.wikiKey).toBe("RawOuratite");
    expect(byCode.get("SILI")?.wikiKey).toBe("RawSilicon");
    expect(byCode.get("HADA")?.wikiKey).toBe("Hadanite");
  });

  it("carries a mineable fallback for gems without wiki method data", () => {
    const entries = loadCuratedOreCodes();
    const withFallback = entries
      .filter((e) => e.mineableByFallback)
      .map((e) => e.code)
      .sort();
    expect(withFallback).toEqual(["CARI", "JACO", "SADA", "SALD"]);
    expect(entries.find((e) => e.code === "CARI")?.mineableByFallback).toEqual({
      ship: false,
      roc: true,
      fps: true,
    });
  });
});
