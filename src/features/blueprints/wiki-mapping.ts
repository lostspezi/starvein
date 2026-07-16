import type { Ore } from "@/features/ores/ores.schema";
import type { ScWikiBlueprint, ScWikiIngredient } from "@/lib/scwiki-client";
import {
  blueprintSchema,
  type Blueprint,
  type BlueprintCategory,
  type BlueprintIngredient,
} from "./blueprints.schema";
import { materialSchema, type Material } from "./materials.schema";

/**
 * Reine Mapping-Schicht Wiki → Domäne. Kein I/O, damit die
 * Zuordnungsregeln (Erz-Join, Einheiten, Kategorien) voll unit-testbar sind.
 */

/**
 * Wiki-`output.type` → UI-Kategorie. Der Rohwert bleibt am Blueprint
 * erhalten; diese Gruppierung dient nur dem Filter.
 */
const CATEGORY_BY_TYPE: Record<string, BlueprintCategory> = {
  WeaponPersonal: "weapon",
  WeaponAttachment: "weapon",
  WeaponGun: "ship-weapon",
  PowerPlant: "ship-component",
  Cooler: "ship-component",
  Shield: "ship-component",
  Radar: "ship-component",
  QuantumDrive: "ship-component",
  DockingCollar: "ship-component",
  WeaponMining: "mining",
  TractorBeam: "mining",
  SalvageHead: "salvage",
  SalvageModifier: "salvage",
  Misc: "other",
};

export function mapBlueprintCategory(
  outputType: string | null,
): BlueprintCategory {
  if (!outputType) return "other";
  if (outputType.startsWith("Char_Armor_")) return "armor";
  return CATEGORY_BY_TYPE[outputType] ?? "other";
}

/**
 * Zutatenname → Erz-Code. Das Wiki führt einzelne Erze mit Suffix
 * ("Saldynium (Ore)"), daher wird ein abschließendes (Ore)/(Raw) entfernt.
 */
export function resolveOreCode(
  name: string | null,
  oreCodeByName: Map<string, string>,
): string | undefined {
  if (!name) return undefined;
  const normalized = name
    .replace(/\s*\((?:ore|raw)\)\s*$/i, "")
    .trim()
    .toLowerCase();
  return oreCodeByName.get(normalized);
}

/** Erz-Code, sonst UPPER_SNAKE_CASE aus dem Namen. */
export function materialCodeForIngredient(
  name: string,
  oreCode: string | undefined,
): string {
  if (oreCode) return oreCode;
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Die Wiki-uuid der Zutat — je nach Art aus resource_type_uuid oder item_uuid. */
function ingredientUuid(ingredient: ScWikiIngredient): string | null {
  return ingredient.kind === "item"
    ? ingredient.item_uuid
    : ingredient.resource_type_uuid;
}

/** Die Menge in der jeweiligen Einheit: SCU (float) bzw. Stückzahl (int). */
function ingredientQuantity(ingredient: ScWikiIngredient): number | null {
  return ingredient.kind === "item"
    ? ingredient.quantity
    : ingredient.quantity_scu;
}

function mapIngredient(
  ingredient: ScWikiIngredient,
  resolveMaterialCode: (name: string | null) => string | undefined,
): BlueprintIngredient | null {
  const { name, kind } = ingredient;
  if (!name || (kind !== "resource" && kind !== "item")) return null;

  const quantity = ingredientQuantity(ingredient);
  if (quantity === null || quantity <= 0) return null;

  const materialCode =
    resolveMaterialCode(name) ?? materialCodeForIngredient(name, undefined);
  if (!materialCode) return null;

  return { materialCode, kind, quantity };
}

/**
 * Ein Wiki-Blueprint → Domänen-Blueprint. Gibt null zurück, wenn keine
 * verwertbare Zutat übrig bleibt (ein Blueprint ohne Zutaten ist keine
 * Bauanleitung).
 */
export function mapWikiBlueprint(
  wikiBlueprint: ScWikiBlueprint,
  resolveMaterialCode: (name: string | null) => string | undefined,
  syncedAt: string,
): Blueprint | null {
  const ingredients = (wikiBlueprint.ingredients ?? [])
    .map((ingredient) => mapIngredient(ingredient, resolveMaterialCode))
    .filter(
      (ingredient): ingredient is BlueprintIngredient => ingredient !== null,
    );

  if (ingredients.length === 0) return null;

  const outputType = wikiBlueprint.output?.type ?? null;
  const outputName =
    wikiBlueprint.output_name ??
    wikiBlueprint.output?.name ??
    wikiBlueprint.output_class ??
    wikiBlueprint.output?.class ??
    wikiBlueprint.key;

  // safeParse statt parse: die Wiki-API ist community-gepflegt — ein
  // einzelner unerwarteter Eintrag darf den Sync nicht abbrechen, sondern
  // wird geloggt und übersprungen (gleiche Policy wie unbekannte Ore-Codes).
  const result = blueprintSchema.safeParse({
    key: wikiBlueprint.key,
    slug: wikiBlueprint.key.toLowerCase(),
    wikiUuid: wikiBlueprint.uuid,
    outputName,
    outputType: outputType ?? "Unknown",
    category: mapBlueprintCategory(outputType),
    craftTimeSeconds: wikiBlueprint.craft_time_seconds ?? 0,
    isAvailableByDefault: wikiBlueprint.is_available_by_default,
    ingredients,
    gameVersion: wikiBlueprint.game_version ?? "unknown",
    sourceType: "wiki",
    syncedAt,
  });
  if (!result.success) {
    console.warn(
      `Skipping wiki blueprint "${wikiBlueprint.key}": ${result.error.issues
        .map((issue) => `${issue.path.join(".")} ${issue.message}`)
        .join("; ")}`,
    );
    return null;
  }
  return result.data;
}

/**
 * Leitet den Materialkatalog aus den Zutaten aller Blueprints ab
 * (34 von 37 Zutaten sind Erze — daher der oreCode-Join).
 */
export function collectMaterials(
  wikiBlueprints: ScWikiBlueprint[],
  ores: Ore[],
  gameVersion: string,
  syncedAt: string,
): Material[] {
  const oreCodeByName = new Map(
    ores.map((ore) => [ore.name_en.toLowerCase(), ore.code]),
  );
  const byCode = new Map<string, Material>();

  for (const wikiBlueprint of wikiBlueprints) {
    for (const ingredient of wikiBlueprint.ingredients ?? []) {
      const { name, kind } = ingredient;
      if (!name || (kind !== "resource" && kind !== "item")) continue;

      const wikiUuid = ingredientUuid(ingredient);
      if (!wikiUuid) continue;

      const oreCode = resolveOreCode(name, oreCodeByName);
      const code = materialCodeForIngredient(name, oreCode);
      if (!code || byCode.has(code)) continue;

      byCode.set(
        code,
        materialSchema.parse({
          code,
          name,
          kind,
          ...(oreCode ? { oreCode } : {}),
          wikiUuid,
          gameVersion,
          sourceType: "wiki",
          syncedAt,
        }),
      );
    }
  }

  return [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Baut den Namens→Material-Code-Resolver für mapWikiBlueprint. */
export function buildMaterialCodeResolver(
  ores: Ore[],
): (name: string | null) => string | undefined {
  const oreCodeByName = new Map(
    ores.map((ore) => [ore.name_en.toLowerCase(), ore.code]),
  );
  return (name) => {
    if (!name) return undefined;
    return materialCodeForIngredient(name, resolveOreCode(name, oreCodeByName));
  };
}
