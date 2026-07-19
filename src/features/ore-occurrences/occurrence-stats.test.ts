import { describe, expect, it } from "vitest";
import type { OccurrenceWithLocation } from "./ore-occurrences.service";
import { buildOreOccurrenceStats } from "./occurrence-stats";

function occurrence(
  overrides: Partial<OccurrenceWithLocation>,
): OccurrenceWithLocation {
  return {
    oreCode: "HADA",
    systemCode: "STANTON",
    bodySlug: "daymar",
    method: "fps",
    probabilityPercent: 30,
    patchVersion: "4.7",
    sourceType: "wiki",
    confidenceScore: 0.9,
    lastVerifiedAt: "2026-07-09",
    bodyName: "Daymar",
    bodyType: "moon",
    bestRawSell: null,
    bestRefinedSell: null,
    ...overrides,
  };
}

describe("buildOreOccurrenceStats", () => {
  it("counts distinct locations and systems and picks the best occurrence", () => {
    const stats = buildOreOccurrenceStats([
      occurrence({ bodySlug: "daymar", bodyName: "Daymar", method: "fps" }),
      occurrence({ bodySlug: "daymar", bodyName: "Daymar", method: "roc" }),
      occurrence({
        bodySlug: "lyria",
        bodyName: "Lyria",
        probabilityPercent: 60,
        method: "roc",
      }),
      occurrence({
        systemCode: "PYRO",
        bodySlug: "bloom",
        bodyName: "Bloom",
        probabilityPercent: 45,
      }),
    ]);

    expect(stats).toEqual({
      locationCount: 3,
      systemCount: 2,
      best: {
        bodyName: "Lyria",
        probabilityPercent: 60,
        method: "roc",
      },
    });
  });

  it("returns zeros and null for an empty list", () => {
    expect(buildOreOccurrenceStats([])).toEqual({
      locationCount: 0,
      systemCount: 0,
      best: null,
    });
  });
});
