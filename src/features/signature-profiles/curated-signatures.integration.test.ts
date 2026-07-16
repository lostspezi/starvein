import { describe, expect, it } from "vitest";
import { loadCuratedOreCodes } from "@/features/ores/curated-ore-codes";
import { loadCuratedSignatureProfiles } from "./curated-signatures";

describe("curated signature profiles dataset", () => {
  it("loads 26 ship + 11 fps + 11 roc profiles", () => {
    const profiles = loadCuratedSignatureProfiles();
    const byMethod = (method: string) =>
      profiles.filter((p) => p.method === method).length;

    expect(byMethod("ship")).toBe(26);
    expect(byMethod("fps")).toBe(11);
    expect(byMethod("roc")).toBe(11);
    expect(profiles.length).toBe(48);
  });

  it("gives Quantainium its per-mineral ship signature 3170", () => {
    const quan = loadCuratedSignatureProfiles().find(
      (p) => p.oreCode === "QUAN" && p.method === "ship",
    );
    expect(quan?.signatureValue).toBe(3170);
    expect(quan?.dominantCompositionRange).toEqual({ min: 40, max: 80 });
  });

  it("uses size-based signatures for all ground deposits", () => {
    const profiles = loadCuratedSignatureProfiles();
    for (const p of profiles.filter((p) => p.method === "fps")) {
      expect(p.signatureValue).toBe(3000);
    }
    for (const p of profiles.filter((p) => p.method === "roc")) {
      expect(p.signatureValue).toBe(4000);
    }
  });

  it("marks pure ship minerals with a 50-100% composition range", () => {
    const profiles = loadCuratedSignatureProfiles();
    for (const code of ["BERY", "TARA", "TORI", "IRON", "ICEW"]) {
      const profile = profiles.find(
        (p) => p.oreCode === code && p.method === "ship",
      );
      expect(profile?.dominantCompositionRange).toEqual({ min: 50, max: 100 });
    }
  });

  it("references only ores known to the wiki code mapping", () => {
    const codes = new Set(loadCuratedOreCodes().map((entry) => entry.code));
    for (const profile of loadCuratedSignatureProfiles()) {
      expect(codes.has(profile.oreCode)).toBe(true);
    }
  });
});
