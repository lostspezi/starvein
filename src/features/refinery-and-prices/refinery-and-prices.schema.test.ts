import { describe, expect, it } from "vitest";
import { mapUexCommodity } from "./uex-mapping";

describe("mapUexCommodity", () => {
  const knownCodes = new Set(["IRON", "GOLD", "RICC", "JACO", "CARI"]);

  it("maps a refined commodity with a direct code match", () => {
    expect(
      mapUexCommodity(
        { id: 1, code: "GOLD", name: "Gold", is_raw: 0 },
        knownCodes,
      ),
    ).toEqual({ oreCode: "GOLD", kind: "refined" });
  });

  it("maps raw variants via is_raw", () => {
    expect(
      mapUexCommodity(
        { id: 2, code: "GOLD", name: "Gold (Ore)", is_raw: 1 },
        knownCodes,
      ),
    ).toEqual({ oreCode: "GOLD", kind: "raw" });
  });

  it("treats (Ore)/(Raw) name suffixes as raw even without is_raw", () => {
    expect(
      mapUexCommodity(
        { id: 3, code: "SALD", name: "Saldynium (Ore)", is_raw: 0 },
        new Set(["SALD"]),
      ),
    ).toEqual({ oreCode: "SALD", kind: "raw" });
  });

  it("resolves diverging raw codes via the alias table", () => {
    expect(
      mapUexCommodity(
        { id: 4, code: "IRONO", name: "Iron (Ore)", is_raw: 1 },
        knownCodes,
      ),
    ).toEqual({ oreCode: "IRON", kind: "raw" });
    expect(
      mapUexCommodity(
        { id: 5, code: "RICO", name: "Riccite (Ore)", is_raw: 1 },
        knownCodes,
      ),
    ).toEqual({ oreCode: "RICC", kind: "raw" });
  });

  it("maps refined Jaclium (JACL) onto our JACO ore", () => {
    expect(
      mapUexCommodity(
        { id: 6, code: "JACL", name: "Jaclium", is_raw: 0 },
        knownCodes,
      ),
    ).toEqual({ oreCode: "JACO", kind: "refined" });
  });

  it("returns null for commodities that are not tracked ores", () => {
    expect(
      mapUexCommodity(
        { id: 7, code: "WIDO", name: "WiDoW", is_raw: 0 },
        knownCodes,
      ),
    ).toBeNull();
  });
});
