import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { createGuide } from "@/features/guides/guides.service";
import type {
  GuideInput,
  GuideTranslationInput,
} from "@/features/guides/guides.schema";
import {
  upsertCelestialBodies,
  upsertStarSystems,
} from "@/features/locations/locations.repository";
import { upsertOreOccurrences } from "@/features/ore-occurrences/ore-occurrences.repository";
import { upsertOres } from "@/features/ores/ores.repository";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  buildBodyOgImage,
  buildDefaultOgImage,
  buildGuideOgImage,
  buildOreOgImage,
} from "./og-image";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

async function expectPng(response: Response | null) {
  expect(response).not.toBeNull();
  expect(response!.headers.get("content-type")).toBe("image/png");
  const bytes = new Uint8Array(await response!.arrayBuffer());
  expect(bytes.length).toBeGreaterThan(1000);
  expect([...bytes.slice(0, 4)]).toEqual(PNG_MAGIC);
}

function paragraph(text: string): GuideTranslationInput["content"] {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  } as GuideTranslationInput["content"];
}

const guideInput: GuideInput = {
  tags: ["mining"],
  isPublic: true,
  translations: [
    {
      language: "en",
      title: "Mining Quantainium in the Aaron Halo",
      description: "Where to look and how to scan",
      content: paragraph("Head to the Aaron Halo."),
    },
  ],
};

describe("og image builders", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("og-image"));
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
    await upsertOreOccurrences(db, [
      {
        oreCode: "HADA",
        systemCode: "STANTON",
        bodySlug: "daymar",
        method: "fps",
        probabilityPercent: 42,
        patchVersion: "4.7",
        sourceType: "wiki",
        confidenceScore: 0.9,
        lastVerifiedAt: "2026-07-09",
      },
    ]);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("renders the default site card as PNG for both locales", async () => {
    await expectPng(await buildDefaultOgImage("en"));
    await expectPng(await buildDefaultOgImage("de"));
  });

  it("renders an ore card with occurrence stats as PNG", async () => {
    await expectPng(await buildOreOgImage(db, { locale: "en", code: "hada" }));
  });

  it("returns null for an unknown ore code", async () => {
    expect(
      await buildOreOgImage(db, { locale: "en", code: "nope" }),
    ).toBeNull();
  });

  it("renders a celestial-body card as PNG", async () => {
    await expectPng(
      await buildBodyOgImage(db, {
        locale: "de",
        system: "stanton",
        body: "daymar",
      }),
    );
  });

  it("returns null for an unknown body", async () => {
    expect(
      await buildBodyOgImage(db, {
        locale: "en",
        system: "stanton",
        body: "atlantis",
      }),
    ).toBeNull();
  });

  it("renders a public guide card as PNG", async () => {
    const guide = await createGuide(db, "user-1", guideInput);
    await expectPng(
      await buildGuideOgImage(db, { locale: "en", id: guide.id }),
    );
  });

  it("returns null for a private guide", async () => {
    const guide = await createGuide(db, "user-1", {
      ...guideInput,
      isPublic: false,
    });
    expect(
      await buildGuideOgImage(db, { locale: "en", id: guide.id }),
    ).toBeNull();
  });
});
