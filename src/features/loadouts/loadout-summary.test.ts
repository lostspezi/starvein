import { describe, expect, it } from "vitest";
import { summarizeLasers } from "./loadout-summary";

const laserNames = new Map([
  ["helix-ii", "Helix II"],
  ["arbor-mh2", "Arbor MH2"],
]);

describe("summarizeLasers", () => {
  it("groups duplicate lasers with a count prefix", () => {
    const summary = summarizeLasers(
      [
        { laserCode: "helix-ii" },
        { laserCode: "helix-ii" },
        { laserCode: "helix-ii" },
      ],
      laserNames,
    );
    expect(summary).toBe("3× Helix II");
  });

  it("joins mixed lasers with a comma", () => {
    const summary = summarizeLasers(
      [
        { laserCode: "helix-ii" },
        { laserCode: "arbor-mh2" },
        { laserCode: "helix-ii" },
      ],
      laserNames,
    );
    expect(summary).toBe("2× Helix II, Arbor MH2");
  });

  it("falls back to the raw code for unknown lasers", () => {
    const summary = summarizeLasers(
      [{ laserCode: "unknown-laser" }],
      laserNames,
    );
    expect(summary).toBe("unknown-laser");
  });

  it("returns an empty string without hardpoints", () => {
    expect(summarizeLasers([], laserNames)).toBe("");
  });
});
