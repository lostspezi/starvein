import { describe, expect, it } from "vitest";
import type { UexItemPriceRecord } from "@/lib/uex-client";
import {
  buildLocationLabel,
  mapUexItemSlug,
  UEX_EQUIPMENT_CATEGORIES,
} from "./equipment-uex-mapping";

const knownLasers = new Set(["helix-ii", "arbor-mh1", "s0-helix"]);
const knownModules = new Set(["rieger-c3", "roc-module"]);
const knownGadgets = new Set(["optimax"]);

function priceRecord(
  overrides: Partial<UexItemPriceRecord> = {},
): UexItemPriceRecord {
  return {
    id_item: 800,
    id_terminal: 21,
    terminal_name: "Dumper's Depot - Area18",
    price_buy: 43500,
    star_system_name: null,
    planet_name: null,
    orbit_name: null,
    moon_name: null,
    space_station_name: null,
    outpost_name: null,
    city_name: null,
    terminal_is_player_owned: 0,
    ...overrides,
  };
}

describe("mapUexItemSlug", () => {
  it("strips the mining-laser suffix", () => {
    expect(mapUexItemSlug("helix-ii-mining-laser", "laser", knownLasers)).toBe(
      "helix-ii",
    );
  });

  it("falls back to the raw slug for vehicle lasers", () => {
    expect(mapUexItemSlug("s0-helix", "laser", knownLasers)).toBe("s0-helix");
  });

  it("strips the module suffix", () => {
    expect(mapUexItemSlug("rieger-c3-module", "module", knownModules)).toBe(
      "rieger-c3",
    );
  });

  it("falls back to the raw slug for roc-module", () => {
    expect(mapUexItemSlug("roc-module", "module", knownModules)).toBe(
      "roc-module",
    );
  });

  it("maps gadget slugs directly", () => {
    expect(mapUexItemSlug("optimax", "gadget", knownGadgets)).toBe("optimax");
  });

  it("returns null for unknown slugs", () => {
    expect(mapUexItemSlug("unmapped-mining-laser", "laser", knownLasers)).toBe(
      null,
    );
    expect(mapUexItemSlug("lawson-laser", "laser", knownLasers)).toBe(null);
  });
});

describe("buildLocationLabel", () => {
  it("joins city, planet and system", () => {
    expect(
      buildLocationLabel(
        priceRecord({
          city_name: "Area18",
          planet_name: "ArcCorp",
          star_system_name: "Stanton",
        }),
      ),
    ).toBe("Area18 · ArcCorp · Stanton");
  });

  it("prefers moon over planet and outpost as site", () => {
    expect(
      buildLocationLabel(
        priceRecord({
          outpost_name: "Shubin SMO-10",
          moon_name: "Lyria",
          planet_name: "ArcCorp",
          star_system_name: "Stanton",
        }),
      ),
    ).toBe("Shubin SMO-10 · Lyria · Stanton");
  });

  it("handles station-only records", () => {
    expect(
      buildLocationLabel(
        priceRecord({
          space_station_name: "Everus Harbor",
          star_system_name: "Stanton",
        }),
      ),
    ).toBe("Everus Harbor · Stanton");
  });

  it("returns an empty string when nothing is set", () => {
    expect(buildLocationLabel(priceRecord())).toBe("");
  });

  it("drops duplicate adjacent parts", () => {
    expect(
      buildLocationLabel(
        priceRecord({
          city_name: "Lorville",
          planet_name: "Lorville",
          star_system_name: "Stanton",
        }),
      ),
    ).toBe("Lorville · Stanton");
  });
});

describe("UEX_EQUIPMENT_CATEGORIES", () => {
  it("uses the verified UEX category ids", () => {
    expect(UEX_EQUIPMENT_CATEGORIES).toEqual({
      gadget: 28,
      laser: 29,
      module: 30,
    });
  });
});
