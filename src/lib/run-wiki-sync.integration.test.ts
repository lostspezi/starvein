import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { upsertStarSystems } from "@/features/locations/locations.repository";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { SCWIKI_TEST_BASE_URL, scWikiServer } from "@/test/scwiki-server";
import { runFullWikiSync } from "./run-wiki-sync";

describe("runFullWikiSync", () => {
  let db: Db;

  beforeAll(() => {
    process.env.SCWIKI_API_BASE_URL = SCWIKI_TEST_BASE_URL;
    scWikiServer.listen({ onUnhandledRequest: "error" });
  });

  afterAll(async () => {
    scWikiServer.close();
    delete process.env.SCWIKI_API_BASE_URL;
    await closeMongo();
  });

  beforeEach(async () => {
    db = await getDb(uniqueDbName("full-wiki-sync"));
    await upsertStarSystems(db, [
      { code: "STANTON", name: "Stanton", status: "live", uexId: 68 },
    ]);
  });

  // Drei Syncs in Folge — unter Volllast der Suite dauert das länger als 5s
  it(
    "runs locations, mining data and blueprints in order",
    { timeout: 30_000 },
    async () => {
      const summary = await runFullWikiSync(db);

      // 7 Bodies: inkl. Halo Band Alpha, das trotz has_resources=false über
      // die Mining-Daten-Referenz gerettet wird (4.9: Flag upstream kaputt)
      expect(summary.locations.bodies).toBe(7);
      expect(summary.miningData.ores).toBe(4);
      // 7 Occurrences: inkl. AGRI auf dem geretteten Halo Band Alpha
      expect(summary.miningData.occurrences).toBe(7);
      expect(summary.miningData.skippedOccurrences).toBe(1);
      // Blueprint-Zutaten lösen gegen den frisch gesyncten Erz-Katalog auf
      expect(summary.blueprints.blueprints).toBe(2);
    },
  );

  it("aggregates counts in syncMeta", { timeout: 30_000 }, async () => {
    await runFullWikiSync(db);

    const meta = await db.collection("syncMeta").findOne({ key: "scwiki" });
    expect(meta).toMatchObject({
      counts: {
        bodies: 7,
        ores: 4,
        occurrences: 7,
        blueprints: 2,
      },
    });
  });
});
