import type { Db } from "mongodb";
import { loadEquipmentCatalog } from "@/features/loadouts/equipment.repository";
import { summarizeLasers } from "@/features/loadouts/loadout-summary";
import { listPublicLoadouts } from "@/features/loadouts/loadouts.repository";
import type { Loadout } from "@/features/loadouts/loadouts.schema";
import { bestCaseBreakableMass } from "@/features/rock-calculator/rock-break";

export type ShowcaseLoadout = {
  loadout: Loadout;
  vehicleName: string;
  laserSummary: string;
  /** Max. knackbare Masse bei 0 % Resistenz; null = nicht berechenbar (ROC). */
  breakabilityMass: number | null;
};

export type LoadoutShowcase = {
  feature: ShowcaseLoadout | null;
  top: ShowcaseLoadout[];
  newest: ShowcaseLoadout[];
};

const TOP_COUNT = 3;
const NEWEST_COUNT = 4;

/**
 * Read-Model für das Startseiten-Bento: das höchstbewertete Loadout als
 * Feature, die nächsten Top-Plätze und die neuesten Einträge. Das Feature
 * wird aus "newest" dededupliziert; Überlappung top↔newest bleibt erlaubt,
 * damit ein junger Datenbestand keine leeren Spalten erzeugt.
 */
export async function findLoadoutShowcase(db: Db): Promise<LoadoutShowcase> {
  const [topRaw, newestRaw, catalog] = await Promise.all([
    listPublicLoadouts(db, { sort: "top", limit: TOP_COUNT + 1 }),
    listPublicLoadouts(db, { sort: "new", limit: NEWEST_COUNT + 1 }),
    loadEquipmentCatalog(db),
  ]);

  const vehicleNames = new Map(catalog.vehicles.map((v) => [v.code, v.name]));
  const laserNames = new Map(catalog.lasers.map((l) => [l.code, l.name]));
  const catalogIndex = {
    lasersByCode: new Map(catalog.lasers.map((l) => [l.code, l])),
    modulesByCode: new Map(catalog.modules.map((m) => [m.code, m])),
  };
  const decorate = (loadout: Loadout): ShowcaseLoadout => ({
    loadout,
    vehicleName: vehicleNames.get(loadout.vehicleCode) ?? loadout.vehicleCode,
    laserSummary: summarizeLasers(loadout.hardpoints, laserNames),
    breakabilityMass: bestCaseBreakableMass(loadout, catalogIndex),
  });

  const feature = topRaw[0] ?? null;
  return {
    feature: feature ? decorate(feature) : null,
    top: topRaw.slice(1).map(decorate),
    newest: newestRaw
      .filter((loadout) => loadout.id !== feature?.id)
      .slice(0, NEWEST_COUNT)
      .map(decorate),
  };
}
