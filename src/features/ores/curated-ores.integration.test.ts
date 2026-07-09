import { describe, expect, it } from "vitest";
import { loadCuratedOres } from "./curated-ores";

describe("curated ores dataset", () => {
  it("loads and validates all curated ores", () => {
    const ores = loadCuratedOres();
    // 26 Ship-Erze + 11 ROC/FPS-Minerale (Diftic/SC 4.7)
    expect(ores.length).toBe(37);
  });

  it("has unique codes", () => {
    const codes = loadCuratedOres().map((o) => o.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("contains Quantainium as legendary ship-only ore", () => {
    const quan = loadCuratedOres().find((o) => o.code === "QUAN");
    expect(quan).toMatchObject({
      rarityTier: "legendary",
      mineableBy: { ship: true, roc: false, fps: false },
    });
  });

  it("contains Hadanite as ROC/FPS-only mineral", () => {
    const hada = loadCuratedOres().find((o) => o.code === "HADA");
    expect(hada).toMatchObject({
      mineableBy: { ship: false, roc: true, fps: true },
    });
  });

  it("uses the UEX code CARI for Carinite (not CARA/Caranite)", () => {
    const ores = loadCuratedOres();
    expect(ores.some((o) => o.code === "CARI")).toBe(true);
    expect(ores.some((o) => o.code === "CARA")).toBe(false);
  });
});
