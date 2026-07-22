import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { upsertBlueprints } from "@/features/blueprints/blueprints.repository";
import { upsertMaterials } from "@/features/blueprints/materials.repository";
import { createGuide } from "@/features/guides/guides.service";
import type { GuideInput } from "@/features/guides/guides.schema";
import {
  upsertCelestialBodies,
  upsertStarSystems,
} from "@/features/locations/locations.repository";
import { upsertOres } from "@/features/ores/ores.repository";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { buildSitemapEntries, buildStaticEntries } from "./sitemap-entries";

const WIKI_SYNCED_AT = "2026-07-16T00:00:00.000Z";

const guideInput: GuideInput = {
  tags: ["mining"],
  isPublic: true,
  translations: [
    {
      language: "en",
      title: "Aaron Halo route",
      description: "Scanning basics",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Fly out and scan." }],
          },
        ],
      } as GuideInput["translations"][number]["content"],
    },
  ],
};

describe("buildStaticEntries", () => {
  it("covers every indexable section per locale without fake lastModified", () => {
    const entries = buildStaticEntries();
    const urls = entries.map((e) => e.url);

    for (const path of [
      "",
      "/ores",
      "/locations",
      "/occurrences",
      "/signatures",
      "/compare",
      "/calculator",
      "/loadouts",
      "/companion",
      "/guides",
      "/ships",
      "/materials",
      "/blueprints",
    ]) {
      expect(urls).toContain(`https://starvein.app/de${path}`);
      expect(urls).toContain(`https://starvein.app/en${path}`);
    }
    expect(entries.every((e) => e.lastModified === undefined)).toBe(true);
  });
});

describe("buildSitemapEntries", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("sitemap"));
    await db
      .collection("syncMeta")
      .updateOne(
        { key: "scwiki" },
        { $set: { key: "scwiki", syncedAt: WIKI_SYNCED_AT } },
        { upsert: true },
      );
    await upsertOres(db, [
      {
        code: "HADA",
        name_de: "Hadanit",
        name_en: "Hadanite",
        rarityTier: "epic",
        mineableBy: { ship: false, roc: true, fps: true },
      },
    ]);
    await upsertStarSystems(db, [
      { code: "STANTON", name: "Stanton", status: "live", uexId: 1 },
    ]);
    await upsertCelestialBodies(db, [
      {
        slug: "daymar",
        systemCode: "STANTON",
        type: "moon",
        name: "Daymar",
        parentSlug: null,
      },
    ]);
    await upsertMaterials(db, [
      {
        code: "HADA",
        name: "Hadanite",
        kind: "item",
        oreCode: "HADA",
        wikiUuid: "26838ca7-418a-47d2-8429-7339ebbb8993",
        gameVersion: "4.8",
        sourceType: "wiki",
        syncedAt: WIKI_SYNCED_AT,
      },
    ]);
    await upsertBlueprints(db, [
      {
        key: "BP_CRAFT_Char_Armor_Helmet_01",
        slug: "bp_craft_char_armor_helmet_01",
        wikiUuid: "1893e596-acaf-49bc-b367-e43e99c2925f",
        outputName: "Beacon Helmet",
        outputType: "Char_Armor_Helmet",
        category: "armor",
        craftTimeSeconds: 120,
        isAvailableByDefault: true,
        ingredients: [{ materialCode: "HADA", kind: "item", quantity: 2 }],
        gameVersion: "4.8",
        sourceType: "wiki",
        syncedAt: "2026-07-15T12:00:00.000Z",
      },
    ]);
  });

  afterAll(async () => {
    await closeMongo();
  });

  function byUrl(entries: Awaited<ReturnType<typeof buildSitemapEntries>>) {
    return new Map(entries.map((e) => [e.url, e]));
  }

  it("lists ores, bodies, materials and blueprints with hreflang and lastModified", async () => {
    const entries = byUrl(await buildSitemapEntries(db));

    const ore = entries.get("https://starvein.app/en/ores/hada");
    expect(ore).toBeTruthy();
    expect(ore!.alternates?.languages).toEqual({
      de: "https://starvein.app/de/ores/hada",
      en: "https://starvein.app/en/ores/hada",
    });
    expect(ore!.lastModified).toBe(WIKI_SYNCED_AT);

    const body = entries.get(
      "https://starvein.app/de/locations/stanton/daymar",
    );
    expect(body).toBeTruthy();
    expect(body!.lastModified).toBe(WIKI_SYNCED_AT);

    expect(entries.get("https://starvein.app/en/materials/hada")).toBeTruthy();

    const blueprint = entries.get(
      "https://starvein.app/en/blueprints/bp_craft_char_armor_helmet_01",
    );
    expect(blueprint).toBeTruthy();
    expect(blueprint!.lastModified).toBe("2026-07-15T12:00:00.000Z");
  });

  it("lists public guides with their updatedAt and excludes private ones", async () => {
    const publicGuide = await createGuide(db, "user-1", guideInput);
    const privateGuide = await createGuide(db, "user-1", {
      ...guideInput,
      isPublic: false,
    });

    const entries = byUrl(await buildSitemapEntries(db));

    const guide = entries.get(
      `https://starvein.app/en/guides/${publicGuide.id}`,
    );
    expect(guide).toBeTruthy();
    expect(guide!.lastModified).toBe(publicGuide.updatedAt);
    expect(
      entries.get(`https://starvein.app/en/guides/${privateGuide.id}`),
    ).toBeUndefined();
  });

  it("includes the static section entries", async () => {
    const entries = byUrl(await buildSitemapEntries(db));
    expect(entries.get("https://starvein.app/en/guides")).toBeTruthy();
    expect(entries.get("https://starvein.app/de/ships")).toBeTruthy();
  });
});
