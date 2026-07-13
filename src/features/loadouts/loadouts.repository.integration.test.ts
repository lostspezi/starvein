import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import type { Loadout } from "./loadouts.schema";
import {
  countPublicLoadouts,
  deleteLoadoutById,
  findLoadoutById,
  insertLoadout,
  listLoadoutsByOwner,
  listPublicLoadouts,
  replaceLoadout,
} from "./loadouts.repository";

function loadout(overrides: Partial<Loadout> = {}): Loadout {
  return {
    id: "loadout-1",
    name: "Quantainium MOLE",
    method: "ship",
    vehicleCode: "mole",
    hardpoints: [{ hardpointIndex: 0, laserCode: "helix-ii", moduleCodes: [] }],
    gadgetCodes: [],
    ownerUserId: "user-1",
    isPublic: true,
    votes: { up: 0 },
    voters: [],
    patchVersion: "4.7",
    createdAt: "2026-07-13T08:00:00.000Z",
    updatedAt: "2026-07-13T08:00:00.000Z",
    ...overrides,
  };
}

describe("loadouts repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("loadouts"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("inserts and finds a loadout by id", async () => {
    const created = loadout();
    await insertLoadout(db, created);

    await expect(findLoadoutById(db, "loadout-1")).resolves.toEqual(created);
    await expect(findLoadoutById(db, "missing")).resolves.toBeNull();
  });

  it("replaces a loadout", async () => {
    await insertLoadout(db, loadout());
    await replaceLoadout(db, loadout({ name: "Umbenannt" }));

    const found = await findLoadoutById(db, "loadout-1");
    expect(found?.name).toBe("Umbenannt");
  });

  it("deletes a loadout", async () => {
    await insertLoadout(db, loadout());
    await deleteLoadoutById(db, "loadout-1");

    await expect(findLoadoutById(db, "loadout-1")).resolves.toBeNull();
  });

  describe("listPublicLoadouts", () => {
    beforeEach(async () => {
      await insertLoadout(
        db,
        loadout({
          id: "pub-top",
          name: "Top MOLE",
          votes: { up: 5 },
          voters: ["a", "b", "c", "d", "e"],
          createdAt: "2026-07-01T00:00:00.000Z",
        }),
      );
      await insertLoadout(
        db,
        loadout({
          id: "pub-new",
          name: "Frischer Prospector [S1]",
          method: "ship",
          vehicleCode: "prospector",
          createdAt: "2026-07-12T00:00:00.000Z",
        }),
      );
      await insertLoadout(
        db,
        loadout({
          id: "pub-roc",
          name: "ROC Runner",
          method: "roc",
          vehicleCode: "roc",
          hardpoints: [],
          createdAt: "2026-07-05T00:00:00.000Z",
        }),
      );
      await insertLoadout(
        db,
        loadout({ id: "priv", name: "Geheim", isPublic: false }),
      );
    });

    it("excludes private loadouts", async () => {
      const result = await listPublicLoadouts(db, { sort: "new" });
      expect(result.map((l) => l.id)).not.toContain("priv");
      expect(result).toHaveLength(3);
    });

    it("sorts by votes for top and by createdAt for new", async () => {
      const top = await listPublicLoadouts(db, { sort: "top" });
      expect(top[0]?.id).toBe("pub-top");

      const newest = await listPublicLoadouts(db, { sort: "new" });
      expect(newest[0]?.id).toBe("pub-new");
    });

    it("filters by method and vehicle", async () => {
      const roc = await listPublicLoadouts(db, { sort: "new", method: "roc" });
      expect(roc.map((l) => l.id)).toEqual(["pub-roc"]);

      const prospector = await listPublicLoadouts(db, {
        sort: "new",
        vehicleCode: "prospector",
      });
      expect(prospector.map((l) => l.id)).toEqual(["pub-new"]);
    });

    it("searches case-insensitively in the name", async () => {
      const result = await listPublicLoadouts(db, { sort: "new", q: "mole" });
      expect(result.map((l) => l.id)).toEqual(["pub-top"]);
    });

    it("applies the limit after sorting", async () => {
      const limited = await listPublicLoadouts(db, { sort: "new", limit: 2 });
      expect(limited.map((l) => l.id)).toEqual(["pub-new", "pub-roc"]);

      const unlimited = await listPublicLoadouts(db, { sort: "new" });
      expect(unlimited).toHaveLength(3);
    });

    it("counts only public loadouts", async () => {
      await expect(countPublicLoadouts(db)).resolves.toBe(3);
    });

    it("treats regex special characters in the query literally", async () => {
      const result = await listPublicLoadouts(db, { sort: "new", q: "[S1]" });
      expect(result.map((l) => l.id)).toEqual(["pub-new"]);

      const noMatch = await listPublicLoadouts(db, { sort: "new", q: ".*" });
      expect(noMatch).toEqual([]);
    });
  });

  it("lists own loadouts including private ones, newest update first", async () => {
    await insertLoadout(
      db,
      loadout({ id: "mine-old", updatedAt: "2026-07-01T00:00:00.000Z" }),
    );
    await insertLoadout(
      db,
      loadout({
        id: "mine-priv",
        isPublic: false,
        updatedAt: "2026-07-12T00:00:00.000Z",
      }),
    );
    await insertLoadout(db, loadout({ id: "other", ownerUserId: "user-2" }));

    const mine = await listLoadoutsByOwner(db, "user-1");
    expect(mine.map((l) => l.id)).toEqual(["mine-priv", "mine-old"]);
  });
});
