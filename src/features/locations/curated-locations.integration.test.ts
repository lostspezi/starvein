import { describe, expect, it } from "vitest";
import { loadCuratedStarSystems } from "./curated-locations";
import { SYSTEM_CODES } from "./locations.schema";

describe("curated star systems dataset", () => {
  it("contains Stanton, Pyro and Nyx", () => {
    const systems = loadCuratedStarSystems();
    expect(systems.map((s) => s.code).sort()).toEqual([
      "NYX",
      "PYRO",
      "STANTON",
    ]);
  });

  it("keeps SYSTEM_CODES in sync with the curated systems", () => {
    const curated = loadCuratedStarSystems()
      .map((s) => s.code)
      .sort();
    expect([...SYSTEM_CODES].sort()).toEqual(curated);
  });
});
