import { describe, expect, it } from "vitest";
import { mapUexVehicleSlug, VEHICLE_UEX_SLUGS } from "./ships-uex-mapping";

const KNOWN_CODES = new Set([
  "prospector",
  "mole",
  "golem",
  "roc",
  "roc-ds",
  "atls-geo",
]);

describe("mapUexVehicleSlug", () => {
  it.each([
    ["misc-prospector", "prospector"],
    ["argo-mole", "mole"],
    ["golem", "golem"],
    ["grin-roc", "roc"],
    ["grin-roc-ds", "roc-ds"],
    ["atls-geo", "atls-geo"],
  ])("mappt UEX-Slug %s auf Code %s", (slug, code) => {
    expect(mapUexVehicleSlug(slug, KNOWN_CODES)).toBe(code);
  });

  it("liefert null für unbekannte Slugs (z. B. Nicht-Mining-Schiffe)", () => {
    expect(mapUexVehicleSlug("drak-vulture", KNOWN_CODES)).toBeNull();
  });

  it("liefert null für Sonder-Editionen ohne kuratierten Code", () => {
    expect(mapUexVehicleSlug("mole-carbon-edition", KNOWN_CODES)).toBeNull();
    expect(mapUexVehicleSlug("mole-talus-edition", KNOWN_CODES)).toBeNull();
  });

  it("respektiert knownCodes — Code nicht in der DB => null", () => {
    expect(mapUexVehicleSlug("misc-prospector", new Set(["mole"]))).toBeNull();
  });
});

describe("VEHICLE_UEX_SLUGS", () => {
  it("deckt alle 6 kuratierten Fahrzeuge ab", () => {
    expect(new Set(Object.values(VEHICLE_UEX_SLUGS))).toEqual(KNOWN_CODES);
  });
});
