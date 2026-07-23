import type {
  MiningGadget,
  MiningLaser,
  MiningModule,
  ModifierKey,
} from "@/features/loadouts/equipment.schema";
import type { Loadout } from "@/features/loadouts/loadouts.schema";

/**
 * Break-Formel nach mort13/BreakabilityChart (MIT, Patch 4.x):
 *   requiredPower = mass × C × (1 + resistance%/100) × gadgetRes × Π headRes
 *   knackbar, wenn requiredPower ≤ Σ headPower.
 * Module stacken hier ADDITIV pro Kopf (Regolith-Konvention seit 4.0.1):
 * multiplier = Σ(mᵢ − 1) + 1. Das weicht bewusst von der multiplikativen
 * Anzeige-Aggregation in loadouts/loadout-stats.ts ab — die Angleichung
 * dort ist ein separates Follow-up. Gadgets liegen am Stein und wirken
 * deshalb genau einmal, nicht pro Kopf.
 */
export const ROCK_BREAK_MASS_FACTOR = 0.2;

/** MOLE = 3 Köpfe; mehr Köpfe pro Laser-Typ zeigt das UI nicht an. */
export const MAX_HEADS = 3;

/** Obergrenze der globalen Modul-Auswahl (größtes Slot-Angebot je Laser). */
export const MAX_GLOBAL_MODULES = 3;

/** Eingabegrenzen für den Craft-Bonus (Crafting kann Stats auch senken). */
export const CRAFTED_BONUS_MIN_PCT = -50;
export const CRAFTED_BONUS_MAX_PCT = 100;

export type RockInput = {
  mass: number;
  resistancePct: number;
};

export type HeadStats = {
  power: number;
  resistanceModifier: number;
};

export type HeadsNeededResult = {
  canBreak: boolean;
  /** Minimal nötige Kopf-Anzahl, null wenn selbst MAX_HEADS nicht reichen. */
  heads: number | null;
  requiredAtHeads: number;
  availableAtHeads: number;
};

export type LoadoutCheckResult = {
  canBreak: boolean;
  shipMining: boolean;
  required: number;
  available: number;
};

export type EquipmentCatalogIndex = {
  lasersByCode: Map<string, MiningLaser>;
  modulesByCode: Map<string, MiningModule>;
};

export function additiveModuleStack(
  key: ModifierKey,
  modules: MiningModule[],
): number {
  return modules.reduce(
    (sum, module) => sum + ((module.modifiers[key] ?? 1) - 1),
    1,
  );
}

/**
 * Effektive Werte eines Kopfes; Module werden auf die Slot-Anzahl des
 * Lasers trunkiert. null bei Size-0-Lasern (laserPower in-game
 * normalisiert, nicht mit Schiffs-Lasern vergleichbar).
 * laserPowerBonusPct (Craft-Bonus) skaliert die Basis-Power des Lasers,
 * bevor der Modul-Stack greift — ein gecrafteter Laser hat höhere
 * Grundwerte, Module wirken darauf.
 */
export function headStats(
  laser: MiningLaser,
  modules: MiningModule[],
  laserPowerBonusPct = 0,
): HeadStats | null {
  if (laser.stats.laserPower === null) return null;
  const slotted = modules.slice(0, laser.moduleSlots);
  return {
    power:
      laser.stats.laserPower *
      (1 + laserPowerBonusPct / 100) *
      additiveModuleStack("laserPower", slotted),
    resistanceModifier:
      (laser.modifiers.resistance ?? 1) *
      additiveModuleStack("resistance", slotted),
  };
}

export function requiredPower(input: {
  mass: number;
  resistancePct: number;
  headResistanceModifiers: number[];
  gadgetResistanceModifier?: number;
}): number {
  const headFactor = input.headResistanceModifiers.reduce(
    (product, modifier) => product * modifier,
    1,
  );
  return (
    input.mass *
    ROCK_BREAK_MASS_FACTOR *
    (1 + input.resistancePct / 100) *
    (input.gadgetResistanceModifier ?? 1) *
    headFactor
  );
}

/** Kleinste Kopf-Anzahl (1..MAX_HEADS), mit der der Laser den Stein knackt. */
export function headsNeeded(
  laser: MiningLaser,
  ctx: RockInput & {
    modules: MiningModule[];
    gadget: MiningGadget | null;
    laserPowerBonusPct?: number;
  },
): HeadsNeededResult {
  const head = headStats(laser, ctx.modules, ctx.laserPowerBonusPct ?? 0);
  if (head === null) {
    return {
      canBreak: false,
      heads: null,
      requiredAtHeads: 0,
      availableAtHeads: 0,
    };
  }

  const gadgetResistanceModifier = ctx.gadget?.modifiers.resistance ?? 1;
  let requiredAtHeads = 0;
  let availableAtHeads = 0;
  // Alle n prüfen statt greedy: headRes > 1 (z. B. Arbor) verschiebt das Optimum.
  for (let heads = 1; heads <= MAX_HEADS; heads++) {
    requiredAtHeads = requiredPower({
      mass: ctx.mass,
      resistancePct: ctx.resistancePct,
      headResistanceModifiers: Array.from(
        { length: heads },
        () => head.resistanceModifier,
      ),
      gadgetResistanceModifier,
    });
    availableAtHeads = heads * head.power;
    if (requiredAtHeads <= availableAtHeads) {
      return { canBreak: true, heads, requiredAtHeads, availableAtHeads };
    }
  }
  return { canBreak: false, heads: null, requiredAtHeads, availableAtHeads };
}

/**
 * Prüft ein gespeichertes Loadout gegen den Stein. Hardpoints mit
 * unbekanntem oder nicht vergleichbarem Laser (Size 0) werden ignoriert;
 * das globale Rechner-Gadget gilt, gespeicherte gadgetCodes nicht (v1).
 */
export function checkLoadout(
  loadout: Loadout,
  catalog: EquipmentCatalogIndex,
  rock: RockInput & { gadget: MiningGadget | null },
): LoadoutCheckResult {
  if (loadout.method !== "ship") {
    return { canBreak: false, shipMining: false, required: 0, available: 0 };
  }

  const heads = loadout.hardpoints.flatMap((hardpoint) => {
    const laser = catalog.lasersByCode.get(hardpoint.laserCode);
    if (!laser) return [];
    const modules = hardpoint.moduleCodes.flatMap(
      (code) => catalog.modulesByCode.get(code) ?? [],
    );
    const stats = headStats(laser, modules);
    return stats === null ? [] : [stats];
  });

  const required = requiredPower({
    mass: rock.mass,
    resistancePct: rock.resistancePct,
    headResistanceModifiers: heads.map((head) => head.resistanceModifier),
    gadgetResistanceModifier: rock.gadget?.modifiers.resistance ?? 1,
  });
  const available = heads.reduce((sum, head) => sum + head.power, 0);

  return {
    canBreak: heads.length > 0 && required <= available,
    shipMining: true,
    required,
    available,
  };
}
