import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { CURRENT_PATCH_VERSION } from "@/lib/patch";
import { uniqueDbName } from "@/test/factories";
import {
  deleteGuideById,
  findGuideById,
  insertGuide,
  listGuidesByOwner,
  listPublicGuides,
  listPublicGuideTags,
  replaceGuide,
} from "./guides.repository";
import type { Guide } from "./guides.schema";

function makeGuide(overrides: Partial<Guide> = {}): Guide {
  const now = new Date().toISOString();
  return {
    id: `guide-${Math.random().toString(16).slice(2)}`,
    title: "Sample guide",
    description: undefined,
    tags: ["mining"],
    content: {
      type: "doc",
      content: [{ type: "paragraph" }],
    } as Guide["content"],
    searchText: "sample guide",
    ownerUserId: "owner-1",
    isPublic: true,
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
    expect(found).toMatchObject({ id: guide.id, title: "Sample guide" });
  });

  it("replaces and deletes a guide", async () => {
    const guide = makeGuide();
    await insertGuide(db, guide);
    await replaceGuide(db, { ...guide, title: "Renamed" });
    expect(await findGuideById(db, guide.id)).toMatchObject({
      title: "Renamed",
    });
    await deleteGuideById(db, guide.id);
    expect(await findGuideById(db, guide.id)).toBeNull();
  });

  it("lists only public guides and filters by tags (OR)", async () => {
    await insertGuide(db, makeGuide({ isPublic: true, tags: ["roc"] }));
    await insertGuide(db, makeGuide({ isPublic: true, tags: ["ship"] }));
    await insertGuide(db, makeGuide({ isPublic: true, tags: ["fps"] }));
    await insertGuide(db, makeGuide({ isPublic: false, tags: ["roc"] }));

    const all = await listPublicGuides(db);
    expect(all).toHaveLength(3);

    // ODER-Semantik: roc ODER ship
    const rocOrShip = await listPublicGuides(db, { tags: ["roc", "ship"] });
    expect(rocOrShip).toHaveLength(2);

    const roc = await listPublicGuides(db, { tags: ["roc"] });
    expect(roc).toHaveLength(1);
    expect(roc[0].tags).toContain("roc");
  });

  it("full-text searches the searchText field (title + body)", async () => {
    await insertGuide(
      db,
      makeGuide({ title: "Quantainium run", searchText: "quantainium run" }),
    );
    await insertGuide(
      db,
      makeGuide({
        title: "ROC basics",
        searchText: "roc basics scan the aaron halo carefully",
      }),
    );

    const byTitle = await listPublicGuides(db, { q: "quantainium" });
    expect(byTitle).toHaveLength(1);

    // Treffer im Fließtext (nur in searchText, nicht im Titel)
    const byBody = await listPublicGuides(db, { q: "aaron" });
    expect(byBody).toHaveLength(1);
    expect(byBody[0].title).toBe("ROC basics");
  });

  it("sorts by title when requested", async () => {
    await insertGuide(db, makeGuide({ title: "Zeta guide" }));
    await insertGuide(db, makeGuide({ title: "Alpha guide" }));

    const sorted = await listPublicGuides(db, { sort: "title" });
    expect(sorted.map((g) => g.title)).toEqual(["Alpha guide", "Zeta guide"]);
  });

  it("lists public tags by usage, most-used first", async () => {
    await insertGuide(db, makeGuide({ isPublic: true, tags: ["ship", "roc"] }));
    await insertGuide(db, makeGuide({ isPublic: true, tags: ["roc", "fps"] }));
    await insertGuide(db, makeGuide({ isPublic: false, tags: ["secret"] }));

    const tags = await listPublicGuideTags(db);
    // roc (2×) zuerst, dann fps/ship (je 1×) alphabetisch; privat "secret" raus
    expect(tags).toEqual(["roc", "fps", "ship"]);
  });

  it("caps the tag filter at 10, keeping the most-used", async () => {
    // t0..t9 kommen je 2×, rare0/rare1 je 1× vor
    for (let i = 0; i < 10; i += 1) {
      await insertGuide(db, makeGuide({ isPublic: true, tags: [`t${i}`] }));
      await insertGuide(db, makeGuide({ isPublic: true, tags: [`t${i}`] }));
    }
    await insertGuide(db, makeGuide({ isPublic: true, tags: ["rare0"] }));
    await insertGuide(db, makeGuide({ isPublic: true, tags: ["rare1"] }));

    const tags = await listPublicGuideTags(db);
    expect(tags).toHaveLength(10);
    // die selteneren Tags fallen raus
    expect(tags).not.toContain("rare0");
    expect(tags).not.toContain("rare1");
  });

  it("lists guides by owner including private ones", async () => {
    await insertGuide(db, makeGuide({ ownerUserId: "me", isPublic: false }));
    await insertGuide(db, makeGuide({ ownerUserId: "me", isPublic: true }));
    await insertGuide(db, makeGuide({ ownerUserId: "other" }));

    const mine = await listGuidesByOwner(db, "me");
    expect(mine).toHaveLength(2);
  });
});
