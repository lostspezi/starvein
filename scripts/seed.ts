/**
 * Spielt die kuratierten Seed-Daten (data/curated/*.json) nach MongoDB ein.
 * Aufruf: pnpm seed (lädt .env.local über tsx --env-file)
 */
import { loadCuratedStarSystems } from "@/features/locations/curated-locations";
import { upsertStarSystems } from "@/features/locations/locations.repository";
import {
  loadCuratedMiningGadgets,
  loadCuratedMiningLasers,
  loadCuratedMiningModules,
  loadCuratedMiningVehicles,
} from "@/features/loadouts/curated-equipment";
import {
  upsertMiningGadgets,
  upsertMiningLasers,
  upsertMiningModules,
  upsertMiningVehicles,
} from "@/features/loadouts/equipment.repository";
import { loadCuratedSignatureProfiles } from "@/features/signature-profiles/curated-signatures";
import { upsertSignatureProfiles } from "@/features/signature-profiles/signature-profiles.repository";
import { closeMongo, getDb } from "@/lib/db";

async function main() {
  const db = await getDb();

  const systems = loadCuratedStarSystems();
  await upsertStarSystems(db, systems);
  console.log(`Seeded ${systems.length} star systems`);

  const signatureProfiles = loadCuratedSignatureProfiles();
  await upsertSignatureProfiles(db, signatureProfiles);
  console.log(`Seeded ${signatureProfiles.length} signature profiles`);

  const vehicles = loadCuratedMiningVehicles();
  await upsertMiningVehicles(db, vehicles);
  console.log(`Seeded ${vehicles.length} mining vehicles`);

  const lasers = loadCuratedMiningLasers();
  await upsertMiningLasers(db, lasers);
  console.log(`Seeded ${lasers.length} mining lasers`);

  const modules = loadCuratedMiningModules();
  await upsertMiningModules(db, modules);
  console.log(`Seeded ${modules.length} mining modules`);

  const gadgets = loadCuratedMiningGadgets();
  await upsertMiningGadgets(db, gadgets);
  console.log(`Seeded ${gadgets.length} mining gadgets`);

  // Erze, Locations, Vorkommen, Blueprints und Materialien sind nicht
  // kuratiert, sondern kommen aus dem Star-Citizen-Wiki-Sync: pnpm sync:wiki
  // (siehe scripts/sync-wiki.ts). Die Signatur-Profile hier sind nur der
  // Fallback — der Sync überschreibt Signaturwerte mit Spieldaten.

  console.log(`Done (database '${db.databaseName}').`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => closeMongo());
