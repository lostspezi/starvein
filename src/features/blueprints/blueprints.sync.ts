import type { Db } from "mongodb";
import { findAllOres } from "@/features/ores/ores.repository";
import { scWikiClient } from "@/lib/scwiki-client";
import type { Blueprint } from "./blueprints.schema";
import {
  ensureBlueprintIndexes,
  pruneBlueprintsNotIn,
  upsertBlueprints,
} from "./blueprints.repository";
import {
  ensureMaterialIndexes,
  pruneMaterialsNotIn,
  upsertMaterials,
} from "./materials.repository";
import {
  buildMaterialCodeResolver,
  collectMaterials,
  mapWikiBlueprint,
} from "./wiki-mapping";

export type WikiSyncSummary = {
  gameVersion: string;
  blueprints: number;
  materials: number;
  skippedBlueprints: number;
  prunedBlueprints: number;
  prunedMaterials: number;
  syncedAt: string;
};

/**
 * Zieht alle Crafting-Blueprints vom Star Citizen Wiki und leitet daraus den
 * Materialkatalog ab. Einzige bekannte Quelle für echte Rezepte — UEX führt
 * keine Blueprint→Zutaten-Daten.
 *
 * Wird nie durch User-Requests ausgelöst, nur per Cron/Route-Handler mit
 * Secret (CLAUDE.md §6.1).
 *
 * Der Katalog ist vollständig abgeleitet: was das Wiki nicht mehr liefert,
 * wird entfernt (Prune), damit keine Karteileichen aus alten Patches bleiben.
 */
export async function syncWikiBlueprints(db: Db): Promise<WikiSyncSummary> {
  const syncedAt = new Date().toISOString();

  const [wikiBlueprints, defaultVersion, ores] = await Promise.all([
    scWikiClient.blueprints(),
    scWikiClient.defaultGameVersion(),
    findAllOres(db),
  ]);

  // Das Wiki stempelt jeden Blueprint mit seiner Version; der
  // /game-versions/default-Wert dient als Fallback für den Katalog.
  const gameVersion =
    wikiBlueprints.find((blueprint) => blueprint.game_version)?.game_version ??
    defaultVersion.code;

  const resolveMaterialCode = buildMaterialCodeResolver(ores);

  const blueprints = wikiBlueprints
    .map((blueprint) =>
      mapWikiBlueprint(blueprint, resolveMaterialCode, syncedAt),
    )
    .filter((blueprint): blueprint is Blueprint => blueprint !== null);

  const materials = collectMaterials(
    wikiBlueprints,
    ores,
    gameVersion,
    syncedAt,
  );

  // Materialien zuerst, damit ingredients[].materialCode immer auflöst.
  await upsertMaterials(db, materials);
  await ensureMaterialIndexes(db);
  await upsertBlueprints(db, blueprints);
  await ensureBlueprintIndexes(db);

  const prunedMaterials = await pruneMaterialsNotIn(
    db,
    materials.map((material) => material.code),
  );
  const prunedBlueprints = await pruneBlueprintsNotIn(
    db,
    blueprints.map((blueprint) => blueprint.key),
  );

  await db
    .collection("syncMeta")
    .updateOne(
      { key: "scwiki" },
      { $set: { key: "scwiki", syncedAt, gameVersion } },
      { upsert: true },
    );

  return {
    gameVersion,
    blueprints: blueprints.length,
    materials: materials.length,
    skippedBlueprints: wikiBlueprints.length - blueprints.length,
    prunedBlueprints,
    prunedMaterials,
    syncedAt,
  };
}
