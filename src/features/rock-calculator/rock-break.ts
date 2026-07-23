import type {
  MiningGadget,
  MiningLaser,
  MiningModule,
  ModifierKey,
} from "@/features/loadouts/equipment.schema";
import type { Loadout } from "@/features/loadouts/loadouts.schema";
import {
  CRAFTED_BONUS_MAX_PCT,
  CRAFTED_BONUS_MIN_PCT,
} from "@/features/loadouts/loadouts.schema";
import type { Ore } from "@/features/ores/ores.schema";

/**
 * Break-Formel nach mort13/BreakabilityChart (MIT, Patch 4.x):
 *   effRes = clamp(resistance%/100 × Π headRes × gadgetRes, 0..1)
 *   requiredPower = mass × C / (1 − effRes); knackbar, wenn ≤ Σ headPower.
 * Die Widerstands-Modifikatoren SENKEN also die Resistenz des Steins —
 * bei 0 % Resistenz bewirken sie nichts (verifiziert 2026-07-23 gegen
 * mort13 js/calculations.js nach Community-Feedback; die frühere Variante
 * multiplizierte sie in die nötige Power und überschätzte die knackbare
 * Masse um Faktor 1/Π headRes). Module stacken ADDITIV pro Kopf
 * (Regolith-Konvention seit 4.0.1): multiplier = Σ(mᵢ − 1) + 1 — das
 * weicht bewusst von der multiplikativen Anzeige-Aggregation in
 * loadouts/loadout-stats.ts und von mort13 ab. Gadgets liegen am Stein
 * und wirken deshalb genau einmal, nicht pro Kopf.
 */
export const ROCK_BREAK_MASS_FACTOR = 0.2;

/** MOLE = 3 Köpfe; mehr Köpfe pro Laser-Typ zeigt das UI nicht an. */
export const MAX_HEADS = 3;

/** Obergrenze der globalen Modul-Auswahl (größtes Slot-Angebot je Laser). */
export const MAX_GLOBAL_MODULES = 3;

/**
 * Eingabegrenzen für den Craft-Bonus — definiert in der loadouts-Slice
 * (das Zod-Schema braucht sie), hier für bestehende Importe re-exportiert.
 */
export { CRAFTED_BONUS_MAX_PCT, CRAFTED_BONUS_MIN_PCT };

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

/** Effektive Resistenz des Steins nach allen Modifikatoren, clamp 0..1. */
function effectiveResistance(input: {
  resistancePct: number;
  headResistanceModifiers: number[];
  gadgetResistanceModifier?: number;
}): number {
  const combined =
    input.headResistanceModifiers.reduce(
      (product, modifier) => product * modifier,
      1,
    ) * (input.gadgetResistanceModifier ?? 1);
  return Math.max(0, Math.min(1, (input.resistancePct / 100) * combined));
}

/** Infinity, wenn die effektive Resistenz 100 % erreicht (unknackbar). */
export function requiredPower(input: {
  mass: number;
  resistancePct: number;
  headResistanceModifiers: number[];
  gadgetResistanceModifier?: number;
}): number {
  const denominator = 1 - effectiveResistance(input);
  if (denominator <= 0) return Infinity;
  return (input.mass * ROCK_BREAK_MASS_FACTOR) / denominator;
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

/** Gespeicherte Boni können aus Alt-/Fremddaten außerhalb der Range liegen. */
function clampCraftedBonus(pct: number): number {
  return Math.min(CRAFTED_BONUS_MAX_PCT, Math.max(CRAFTED_BONUS_MIN_PCT, pct));
}

/**
 * Effektive Köpfe eines gespeicherten Loadouts inkl. Craft-Boni; Hardpoints
 * mit unbekanntem oder nicht vergleichbarem Laser (Size 0) fallen raus.
 */
function loadoutHeads(
  loadout: Loadout,
  catalog: EquipmentCatalogIndex,
): HeadStats[] {
  return loadout.hardpoints.flatMap((hardpoint) => {
    const laser = catalog.lasersByCode.get(hardpoint.laserCode);
    if (!laser) return [];
    const modules = hardpoint.moduleCodes.flatMap(
      (code) => catalog.modulesByCode.get(code) ?? [],
    );
    const stats = headStats(
      laser,
      modules,
      clampCraftedBonus(hardpoint.craftedBonusPct ?? 0),
    );
    return stats === null ? [] : [stats];
  });
}

/** Gadget mit der stärksten Resistenz-Senkung (Faktor < 1), sonst null. */
export function bestGadget(gadgets: MiningGadget[]): MiningGadget | null {
  let best: MiningGadget | null = null;
  for (const gadget of gadgets) {
    const factor = gadget.modifiers.resistance ?? 1;
    if (factor >= 1) continue;
    if (best === null || factor < (best.modifiers.resistance ?? 1)) {
      best = gadget;
    }
  }
  return best;
}

/**
 * Prüft ein gespeichertes Loadout gegen den Stein; gespeicherte Craft-Boni
 * zählen mit. Das globale Rechner-Gadget gilt, gespeicherte gadgetCodes
 * nicht (v1).
 */
export function checkLoadout(
  loadout: Loadout,
  catalog: EquipmentCatalogIndex,
  rock: RockInput & { gadget: MiningGadget | null },
): LoadoutCheckResult {
  if (loadout.method !== "ship") {
    return { canBreak: false, shipMining: false, required: 0, available: 0 };
  }

  const heads = loadoutHeads(loadout, catalog);

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

/**
 * Maximale knackbare Steinmasse eines gespeicherten Loadouts — Inversion
 * der Break-Ungleichung: maxMass = Σ headPower × (1 − effRes) / C.
 * 0 bedeutet: bei dieser Resistenz für jede Masse unknackbar (effRes 100 %).
 * null für Nicht-Ship-Loadouts und Loadouts ohne vergleichbare Köpfe
 * (Size 0 / unbekannte Codes).
 */
export function maxBreakableMass(
  loadout: Loadout,
  catalog: EquipmentCatalogIndex,
  rock: { resistancePct: number; gadget: MiningGadget | null },
): number | null {
  if (loadout.method !== "ship") return null;

  const heads = loadoutHeads(loadout, catalog);
  if (heads.length === 0) return null;

  const available = heads.reduce((sum, head) => sum + head.power, 0);
  const effRes = effectiveResistance({
    resistancePct: rock.resistancePct,
    headResistanceModifiers: heads.map((head) => head.resistanceModifier),
    gadgetResistanceModifier: rock.gadget?.modifiers.resistance ?? 1,
  });
  return (available * (1 - effRes)) / ROCK_BREAK_MASS_FACTOR;
}

export type OreBreakabilityRow = {
  oreCode: string;
  oreName: string;
  resistancePct: number;
  maxMass: number;
};

/**
 * Knackbarkeits-Tabelle pro Erz: für jedes ship-minebare Erz mit
 * Resistenz-Daten die maximale Steinmasse, die das Loadout schafft —
 * Näherung: die Resistenz des Erzes steht für Steine, die von diesem
 * Erz dominiert werden. Sortiert schwierigste zuerst. Leer für
 * Loadouts ohne vergleichbare Köpfe (ROC / Size 0).
 */
export function oreBreakabilityRows(
  ores: Ore[],
  loadout: Loadout,
  catalog: EquipmentCatalogIndex,
  gadget: MiningGadget | null,
): OreBreakabilityRow[] {
  return ores
    .flatMap((ore) => {
      if (!ore.mineableBy.ship || ore.resistance === undefined) return [];
      const resistancePct = ore.resistance * 100;
      const maxMass = maxBreakableMass(loadout, catalog, {
        resistancePct,
        gadget,
      });
      if (maxMass === null) return [];
      return [
        { oreCode: ore.code, oreName: ore.name_en, resistancePct, maxMass },
      ];
    })
    .sort((a, b) => b.resistancePct - a.resistancePct);
}

/**
 * Best-Case-Kennzahl für Loadout-Karten: maximale knackbare Masse bei 0 %
 * Resistenz — Modifikatoren und Gadgets senken nur die Resistenz und sind
 * bei 0 % deshalb wirkungslos.
 */
export function bestCaseBreakableMass(
  loadout: Loadout,
  catalog: EquipmentCatalogIndex,
): number | null {
  return maxBreakableMass(loadout, catalog, {
    resistancePct: 0,
    gadget: null,
  });
}
