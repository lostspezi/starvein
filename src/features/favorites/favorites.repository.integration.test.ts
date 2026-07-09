import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  addFavorite,
  isFavorite,
  listFavorites,
  removeFavorite,
} from "./favorites.repository";

const USER = "user-1";
const OTHER = "user-2";

describe("favorites repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("favorites"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("adds and lists favorites per user", async () => {
    await addFavorite(db, USER, "STANTON", "daymar");
    await addFavorite(db, USER, "STANTON", "aaron-halo");
    await addFavorite(db, OTHER, "PYRO", "monox");

    const favorites = await listFavorites(db, USER);

    expect(favorites.map((f) => f.bodySlug).sort()).toEqual([
      "aaron-halo",
      "daymar",
    ]);
    expect(favorites.every((f) => typeof f.createdAt === "string")).toBe(true);
  });

  it("is idempotent when adding the same favorite twice", async () => {
    await addFavorite(db, USER, "STANTON", "daymar");
    await addFavorite(db, USER, "STANTON", "daymar");

    await expect(listFavorites(db, USER)).resolves.toHaveLength(1);
  });

  it("checks whether a body is a favorite", async () => {
    await addFavorite(db, USER, "STANTON", "daymar");

    await expect(isFavorite(db, USER, "STANTON", "daymar")).resolves.toBe(true);
    await expect(isFavorite(db, USER, "STANTON", "yela")).resolves.toBe(false);
    await expect(isFavorite(db, OTHER, "STANTON", "daymar")).resolves.toBe(
      false,
    );
  });

  it("removes a favorite", async () => {
    await addFavorite(db, USER, "STANTON", "daymar");
    await removeFavorite(db, USER, "STANTON", "daymar");

    await expect(listFavorites(db, USER)).resolves.toEqual([]);
  });
});
