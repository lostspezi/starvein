import { describe, expect, it } from "vitest";
import {
  loadCuratedLocationAreaGuides,
  loadCuratedLocationGuides,
} from "./curated-location-guides";

describe("curated location guides dataset", () => {
  it("loads and validates every guide", () => {
    const guides = loadCuratedLocationGuides();
    expect(guides.length).toBeGreaterThan(0);
  });

  it("keys every guide uniquely by system + body slug", () => {
    const keys = loadCuratedLocationGuides().map(
      (g) => `${g.systemCode}/${g.bodySlug}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every guide at least a note or a route", () => {
    for (const guide of loadCuratedLocationGuides()) {
      const hasContent =
        Boolean(guide.note_de || guide.note_en) ||
        (guide.routes?.length ?? 0) > 0;
      expect(hasContent).toBe(true);
    }
  });

  it("includes the two NYX asteroid fields the community asked for", () => {
    const nyx = loadCuratedLocationGuides()
      .filter((g) => g.systemCode === "NYX")
      .map((g) => g.bodySlug);
    expect(nyx).toContain("glaciem-ring");
    expect(nyx).toContain("keeger-belt");
  });

  it("covers the Aaron Halo via a Stanton mining-base area rule", () => {
    const halo = loadCuratedLocationAreaGuides().find(
      (a) => a.systemCode === "STANTON" && a.bodyType === "asteroidField",
    );
    expect(halo).toBeDefined();
    expect(new RegExp(halo!.namePattern).test("Mining Base #01K-I43")).toBe(
      true,
    );
    expect(halo!.routes?.length ?? 0).toBeGreaterThan(0);
  });
});
