import {
  MODIFIER_KEYS,
  type MiningLaser,
  type MiningModule,
  type ModifierKey,
} from "./equipment.schema";

/**
 * Aggregierte Werte eines Hardpoints: absolute Basiswerte aus dem Laser
 * (Power/Ranges) plus multiplikativ kombinierte Modifikatoren aus Laser
 * und Modulen (1.0 = neutral). Aktive Module fließen v1 mit ein und werden
 * im UI als "active" gekennzeichnet. Power ist null bei Size-0-Lasern
 * (in-game normalisiert, nicht mit Schiffs-Lasern vergleichbar).
 */
export type AggregatedStats = Omit<
  Record<ModifierKey, number>,
  "laserPower" | "extractionLaserPower"
> & {
  laserPower: number | null;
  extractionLaserPower: number | null;
  optimalRange: number;
  maxRange: number;
};

export type LoadoutTotals = {
  totalLaserPower: number;
  totalExtractionLaserPower: number;
  minOptimalRange: number;
  maxRange: number;
};

function combinedFactor(
  key: ModifierKey,
  laser: MiningLaser,
  modules: MiningModule[],
): number {
  return modules.reduce(
    (factor, module) => factor * (module.modifiers[key] ?? 1),
    laser.modifiers[key] ?? 1,
  );
}

export function aggregateHardpointStats(
  laser: MiningLaser,
  modules: MiningModule[],
): AggregatedStats {
  const factors = Object.fromEntries(
    MODIFIER_KEYS.map((key) => [key, combinedFactor(key, laser, modules)]),
  ) as Record<ModifierKey, number>;

  return {
    ...factors,
    // Power-Werte sind absolute Basiswerte, die Faktoren skalieren sie
    laserPower:
      laser.stats.laserPower === null
        ? null
        : laser.stats.laserPower * factors.laserPower,
    extractionLaserPower:
      laser.stats.extractionLaserPower === null
        ? null
        : laser.stats.extractionLaserPower * factors.extractionLaserPower,
    optimalRange: laser.stats.optimalRange,
    maxRange: laser.stats.maxRange,
  };
}

/** Schiffs-Gesamtwerte über alle bestückten Hardpoints (z. B. MOLE). */
export function aggregateLoadoutStats(
  perHardpoint: AggregatedStats[],
): LoadoutTotals {
  return {
    totalLaserPower: perHardpoint.reduce(
      (sum, s) => sum + (s.laserPower ?? 0),
      0,
    ),
    totalExtractionLaserPower: perHardpoint.reduce(
      (sum, s) => sum + (s.extractionLaserPower ?? 0),
      0,
    ),
    minOptimalRange: Math.min(...perHardpoint.map((s) => s.optimalRange)),
    maxRange: Math.max(...perHardpoint.map((s) => s.maxRange)),
  };
}
