import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { CURRENT_PATCH_VERSION } from "@/lib/patch";
import { uniqueDbName } from "@/test/factories";
import type { GuideLanguage } from "./guides.languages";
import {
  deleteGuideById,
  findGuideById,
  insertGuide,
  listGuidesByOwner,
  listPublicGuideLanguages,
  listPublicGuides,
  listPublicGuideTags,
  replaceGuide,
} from "./guides.repository";
import type { Guide } from "./guides.schema";

type Translation = Guide["translations"][number];

const emptyContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
} as Translation["content"];

function tr(
  language: GuideLanguage,
  title: string,
  opts: { searchText?: string; description?: string } = {},
): Translation {
  return {
    language,
    title,
    description: opts.description,
    content: emptyContent,
    searchText: opts.searchText ?? title.toLowerCase(),
  };
}

function makeGuide(overrides: Partial<Guide> = {}): Guide {
  const now = new Date().toISOString();
  return {
    id: `guide-${Math.random().toString(16).slice(2)}`,
    tags: ["mining"],
    translations: [tr("en", "Sample guide")],
    ownerUserId: "owner-1",
    isPublic: true,
    votes: { up: 0 },
    voters: [],
    patchVersion: CURRENT_PATCH_VERSION,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("guides repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("guides-repo"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("inserts and reads a guide back through the schema", async () => {
    const guide = makeGuide();
    await insertGuide(db, guide);
    const found = await findGuideById(db, guide.id);
    expect(found?.translations[0].title).toBe("Sample guide");
  });

  it("replaces and deletes a guide", async () => {
    const guide = makeGuide();
    await insertGuide(db, guide);
    await replaceGuide(db, { ...guide, translations: [tr("en", "Renamed")] });
    expect((await findGuideById(db, guide.id))?.translations[0].title).toBe(
      "Renamed",
    );
    await deleteGuideById(db, guide.id);
    expect(await findGuideById(db, guide.id)).toBeNull();
  });

  it("lists only public guides and filters by tags (OR)", async () => {
    await insertGuide(db, makeGuide({ isPublic: true, tags: ["roc"] }));
    await insertGuide(db, makeGuide({ isPublic: true, tags: ["ship"] }));
    await insertGuide(db, makeGuide({ isPublic: true, tags: ["fps"] }));
    await insertGuide(db, makeGuide({ isPublic: false, tags: ["roc"] }));

    expect(await listPublicGuides(db)).toHaveLength(3);
    expect(await listPublicGuides(db, { tags: ["roc", "ship"] })).toHaveLength(
      2,
    );
    const roc = await listPublicGuides(db, { tags: ["roc"] });
    expect(roc).toHaveLength(1);
    expect(roc[0].tags).toContain("roc");
  });

  it("full-text searches across translation body text", async () => {
    await insertGuide(db, makeGuide({ translations: [tr("en", "Quant run")] }));
    await insertGuide(
      db,
      makeGuide({
        translations: [
          tr("en", "ROC basics", { searchText: "roc basics aaron halo" }),
        ],
      }),
    );

    expect(await listPublicGuides(db, { q: "quant" })).toHaveLength(1);
    const byBody = await listPublicGuides(db, { q: "aaron" });
    expect(byBody).toHaveLength(1);
    expect(byBody[0].translations[0].title).toBe("ROC basics");
  });

  it("filters by language", async () => {
    await insertGuide(db, makeGuide({ translations: [tr("en", "EN only")] }));
    await insertGuide(db, makeGuide({ translations: [tr("de", "DE only")] }));
    await insertGuide(
      db,
      makeGuide({ translations: [tr("en", "Both EN"), tr("de", "Both DE")] }),
    );

    expect(await listPublicGuides(db, { language: "de" })).toHaveLength(2);
    expect(await listPublicGuides(db, { language: "en" })).toHaveLength(2);
    expect(await listPublicGuides(db, { language: "fr" })).toHaveLength(0);
  });

  it("scopes full-text search to the requested language", async () => {
    await insertGuide(
      db,
      makeGuide({
        translations: [
          tr("en", "English", { searchText: "aaron halo english" }),
          tr("de", "Deutsch", { searchText: "pyro krater deutsch" }),
        ],
      }),
    );

    // "aaron" steht nur in der englischen Übersetzung
    expect(
      await listPublicGuides(db, { q: "aaron", language: "en" }),
    ).toHaveLength(1);
    expect(
      await listPublicGuides(db, { q: "aaron", language: "de" }),
    ).toHaveLength(0);
  });

  it("sorts by title (in the display language) when requested", async () => {
    await insertGuide(db, makeGuide({ translations: [tr("en", "Zeta")] }));
    await insertGuide(db, makeGuide({ translations: [tr("en", "Alpha")] }));

    const sorted = await listPublicGuides(db, { sort: "title" });
    expect(sorted.map((g) => g.translations[0].title)).toEqual([
      "Alpha",
      "Zeta",
    ]);
  });

  it("lists the most-used tags, most-used first, capped at 10", async () => {
    await insertGuide(db, makeGuide({ tags: ["ship", "roc"] }));
    await insertGuide(db, makeGuide({ tags: ["roc", "fps"] }));
    await insertGuide(db, makeGuide({ isPublic: false, tags: ["secret"] }));
    expect(await listPublicGuideTags(db)).toEqual(["roc", "fps", "ship"]);
  });

  it("lists present public languages in preset order", async () => {
    await insertGuide(db, makeGuide({ translations: [tr("fr", "FR")] }));
    await insertGuide(
      db,
      makeGuide({ translations: [tr("de", "DE"), tr("en", "EN")] }),
    );
    await insertGuide(
      db,
      makeGuide({ isPublic: false, translations: [tr("es", "ES")] }),
    );

    expect(await listPublicGuideLanguages(db)).toEqual(["de", "en", "fr"]);
  });

  it("normalizes legacy flat guides on read", async () => {
    const now = new Date().toISOString();
    await db.collection("guides").insertOne({
      id: "legacy-1",
      title: "Legacy",
      description: "old",
      tags: ["x"],
      content: { type: "doc", content: [] },
      searchText: "legacy old",
      ownerUserId: "o",
      isPublic: true,
      patchVersion: "4.7",
      createdAt: now,
      updatedAt: now,
    });

    const found = await findGuideById(db, "legacy-1");
    expect(found?.translations[0].language).toBe("en");
    expect(found?.translations[0].title).toBe("Legacy");
  });

  it("lists guides by owner including private ones", async () => {
    await insertGuide(db, makeGuide({ ownerUserId: "me", isPublic: false }));
    await insertGuide(db, makeGuide({ ownerUserId: "me", isPublic: true }));
    await insertGuide(db, makeGuide({ ownerUserId: "other" }));

    expect(await listGuidesByOwner(db, "me")).toHaveLength(2);
  });

  it("sorts by votes for the top sort, newest first on ties", async () => {
    await insertGuide(
      db,
      makeGuide({
        id: "low-but-new",
        votes: { up: 1 },
        voters: ["v1"],
        updatedAt: "2026-07-16T12:00:00.000Z",
      }),
    );
    await insertGuide(
      db,
      makeGuide({
        id: "high-but-old",
        votes: { up: 5 },
        voters: ["v1", "v2", "v3", "v4", "v5"],
        updatedAt: "2026-07-01T12:00:00.000Z",
      }),
    );
    await insertGuide(
      db,
      makeGuide({
        id: "tie-older",
        votes: { up: 3 },
        voters: ["v1", "v2", "v3"],
        updatedAt: "2026-07-02T12:00:00.000Z",
      }),
    );
    await insertGuide(
      db,
      makeGuide({
        id: "tie-newer",
        votes: { up: 3 },
        voters: ["v1", "v2", "v3"],
        updatedAt: "2026-07-10T12:00:00.000Z",
      }),
    );

    const sorted = await listPublicGuides(db, { sort: "top" });
    expect(sorted.map((g) => g.id)).toEqual([
      "high-but-old",
      "tie-newer",
      "tie-older",
      "low-but-new",
    ]);
  });

  it("defaults votes for documents without vote fields", async () => {
    const guide = makeGuide();
    const doc: Record<string, unknown> = { ...guide };
    delete doc.votes;
    delete doc.voters;
    await db.collection("guides").insertOne(doc as never);

    const found = await findGuideById(db, guide.id);
    expect(found?.votes).toEqual({ up: 0 });
    expect(found?.voters).toEqual([]);
  });
});
