import type { Blueprint } from "./blueprints.schema";
import type { MaterialKind } from "./materials.schema";

export const CRAFT_STATUSES = ["craftable", "partial", "missing"] as const;
export type CraftStatus = (typeof CRAFT_STATUSES)[number];

export type ComponentAvailability = {
  materialCode: string;
  /** Einheit der Mengen: SCU (resource) oder Stückzahl (item). */
  kind: MaterialKind;
  required: number;
  have: number;
  shortfall: number;
};

export type Craftability = {
  status: CraftStatus;
  components: ComponentAvailability[];
  /** Wie oft der Blueprint mit dem aktuellen Bestand gebaut werden kann. */
  maxCraftable: number;
};

/**
 * SCU-Mengen sind Fließkommazahlen (Wiki liefert z. B. 0.36 SCU). Direkte
 * Vergleiche würden an Rundungsfehlern scheitern (0.1+0.2 > 0.3), daher ein
 * kleiner Toleranzwert — deutlich feiner als die kleinste echte Menge (0.01).
 */
const EPSILON = 1e-6;

/**
 * Reine Craftability-Berechnung — kein DB-Zugriff, damit sie voll unit-testbar
 * bleibt (vgl. compatibility.ts/validateLoadout).
 *
 * v1 kennt keine verschachtelten Blueprints: Zutaten sind immer Materialien.
 * Die Signatur (Blueprint + Bestandskarte → Ergebnis) ist bewusst so gewählt,
 * dass eine spätere rekursive Variante die Aufrufer nicht ändert.
 */
export function computeCraftability(
  blueprint: Blueprint,
  inventory: Map<string, number>,
): Craftability {
  const components: ComponentAvailability[] = blueprint.ingredients.map(
    (ingredient) => {
      const have = inventory.get(ingredient.materialCode) ?? 0;
      const shortfall = Math.max(0, ingredient.quantity - have);
      return {
        materialCode: ingredient.materialCode,
        kind: ingredient.kind,
        required: ingredient.quantity,
        have,
        shortfall: shortfall < EPSILON ? 0 : shortfall,
      };
    },
  );

  const isCraftable = components.every((c) => c.shortfall === 0);
  const ownsSomething = components.some((c) => c.have > 0);

  const status: CraftStatus = isCraftable
    ? "craftable"
    : ownsSomething
      ? "partial"
      : "missing";

  const maxCraftable = isCraftable
    ? Math.min(
        ...components.map((c) => Math.floor(c.have / c.required + EPSILON)),
      )
    : 0;

  return { status, components, maxCraftable };
}
