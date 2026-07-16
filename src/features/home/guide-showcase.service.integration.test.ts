import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { insertGuide } from "@/features/guides/guides.repository";
import type { Guide } from "@/features/guides/guides.schema";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { findGuideShowcase } from "./guide-showcase.service";

const emptyContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
} as Guide["translations"][number]["content"];

function guide(overrides: Partial<Guide> = {}): Guide {
  const votesUp = overrides.votes?.up ?? 0;
  return {
    id: "guide-1",
    tags: ["mining"],
    translations: [
      {
        language: "en",
        title: "Sample guide",
        description: undefined,
        content: emptyContent,
        searchText: "sample guide",
      },
    ],
    ownerUserId: "user-1",
    isPublic: true,
    votes: { up: votesUp },
    voters: Array.from({ length: votesUp }, (_, i) => `voter-${i}`),
    patchVersion: "4.7",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("findGuideShowcase", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("home-guide-showcase"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("returns an empty showcase for an empty database", async () => {
    await expect(findGuideShowcase(db)).resolves.toEqual({
      feature: null,
      newest: [],
    });
  });

  describe("with seeded guides", () => {
    beforeEach(async () => {
      // feature = höchstbewertet, zugleich zweitneuester (testet Dedupe)
      await insertGuide(
        db,
        guide({
          id: "g-feature",
          votes: { up: 10 },
          voters: Array.from({ length: 10 }, (_, i) => `v${i}`),
          updatedAt: "2026-07-10T00:00:00.000Z",
        }),
      );
      await insertGuide(
        db,
        guide({ id: "g-new1", updatedAt: "2026-07-12T00:00:00.000Z" }),
      );
      await insertGuide(
        db,
        guide({ id: "g-new2", updatedAt: "2026-07-05T00:00:00.000Z" }),
      );
      await insertGuide(
        db,
        guide({ id: "g-new3", updatedAt: "2026-07-04T00:00:00.000Z" }),
      );
      await insertGuide(
        db,
        guide({ id: "g-new4", updatedAt: "2026-07-03T00:00:00.000Z" }),
      );
      // privat: darf nirgends auftauchen, obwohl neu und hoch bewertet
      await insertGuide(
        db,
        guide({
          id: "priv",
          isPublic: false,
          votes: { up: 99 },
          voters: [],
          updatedAt: "2026-07-13T00:00:00.000Z",
        }),
      );
    });

    it("features the top-voted public guide", async () => {
      const showcase = await findGuideShowcase(db);
      expect(showcase.feature?.id).toBe("g-feature");
    });

    it("lists up to four newest guides without the feature", async () => {
      const showcase = await findGuideShowcase(db);
      expect(showcase.newest.map((g) => g.id)).toEqual([
        "g-new1",
        "g-new2",
        "g-new3",
        "g-new4",
      ]);
    });
  });
});
