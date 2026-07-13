import { describe, expect, it } from "vitest";
import {
  loadCuratedMiningGadgets,
  loadCuratedMiningLasers,
  loadCuratedMiningModules,
  loadCuratedMiningVehicles,
} from "./curated-equipment";

function codes(rows: { code: string }[]): string[] {
  return rows.map((row) => row.code);
}

describe("curated equipment data", () => {
  const vehicles = loadCuratedMiningVehicles();
  const lasers = loadCuratedMiningLasers();
  const modules = loadCuratedMiningModules();
  const gadgets = loadCuratedMiningGadgets();

  it("loads non-empty, schema-valid catalogs", () => {
    expect(vehicles.length).toBeGreaterThanOrEqual(6);
    expect(lasers.length).toBeGreaterThanOrEqual(13);
    expect(modules.length).toBeGreaterThanOrEqual(20);
    expect(gadgets.length).toBeGreaterThanOrEqual(5);
  });

  it("has unique codes per catalog", () => {
    for (const rows of [vehicles, lasers, modules, gadgets]) {
      const all = codes(rows);
      expect(new Set(all).size).toBe(all.length);
    }
  });

  it("covers every hardpoint size with at least one laser", () => {
    const laserSizes = new Set(lasers.map((laser) => laser.size));
    const hardpointSizes = new Set(
      vehicles.flatMap((vehicle) => vehicle.hardpoints.map((h) => h.size)),
    );
    for (const size of hardpointSizes) {
      expect(laserSizes).toContain(size);
    }
  });

  it("references existing, size-compatible stock lasers", () => {
    const lasersByCode = new Map(lasers.map((laser) => [laser.code, laser]));
    for (const vehicle of vehicles) {
      if (!vehicle.stockLaserCode) continue;
      const stock = lasersByCode.get(vehicle.stockLaserCode);
      expect(
        stock,
        `${vehicle.code} -> ${vehicle.stockLaserCode}`,
      ).toBeDefined();
      expect(
        vehicle.hardpoints.some((h) => h.size === stock?.size),
        `${vehicle.code} stock laser size`,
      ).toBe(true);
    }
  });

  it("contains the core mining vehicles", () => {
    const vehicleCodes = codes(vehicles);
    for (const code of ["prospector", "mole", "golem", "roc"]) {
      expect(vehicleCodes).toContain(code);
    }
  });

  it("null-powers exactly the size-0 lasers", () => {
    for (const laser of lasers) {
      if (laser.size === 0) {
        expect(laser.stats.laserPower).toBeNull();
      } else {
        expect(laser.stats.laserPower).not.toBeNull();
      }
    }
  });
});
