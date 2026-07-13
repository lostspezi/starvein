import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import {
  upsertMiningLasers,
  upsertMiningVehicles,
} from "@/features/loadouts/equipment.repository";
import type {
  MiningLaser,
  MiningVehicle,
} from "@/features/loadouts/equipment.schema";
import { insertLoadout } from "@/features/loadouts/loadouts.repository";
import type { Loadout } from "@/features/loadouts/loadouts.schema";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { findLoadoutShowcase } from "./loadout-showcase.service";

const patchVersion = "4.7";

const mole: MiningVehicle = {
  code: "mole",
  name: "MOLE",
  manufacturer: "ARGO",
  method: "ship",
  hardpoints: [{ size: 2 }, { size: 2 }, { size: 2 }],
  gadgetCapable: true,
  patchVersion,
};

const helix: MiningLaser = {
  code: "helix-ii",
  name: "Helix II",
  manufacturer: "Thermyte Concern",
  size: 2,
  moduleSlots: 3,
  stats: {
    laserPower: 4000,
    extractionLaserPower: 800,
    optimalRange: 40,
    maxRange: 80,
  },
  modifiers: {},
  patchVersion,
};

function loadout(overrides: Partial<Loadout> = {}): Loadout {
  const votesUp = overrides.votes?.up ?? 0;
  return {
    id: "loadout-1",
    name: "Quantainium MOLE",
    method: "ship",
    vehicleCode: "mole",
    hardpoints: [
      { hardpointIndex: 0, laserCode: "helix-ii", moduleCodes: [] },
      { hardpointIndex: 1, laserCode: "helix-ii", moduleCodes: [] },
    ],
    gadgetCodes: [],
    ownerUserId: "user-1",
    isPublic: true,
    votes: { up: votesUp },
    voters: Array.from({ length: votesUp }, (_, i) => `voter-${i}`),
    patchVersion,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("findLoadoutShowcase", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("home-showcase"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("returns empty showcase for an empty database", async () => {
    await expect(findLoadoutShowcase(db)).resolves.toEqual({
      feature: null,
      top: [],
      newest: [],
    });
  });

  describe("with seeded loadouts", () => {
    beforeEach(async () => {
      await upsertMiningVehicles(db, [mole]);
      await upsertMiningLasers(db, [helix]);

      // feature = höchstbewertet, zugleich zweitneuestes (testet Dedupe in "newest")
      await insertLoadout(
        db,
        loadout({
          id: "l-feature",
          name: "Feature",
          votes: { up: 10 },
          voters: Array.from({ length: 10 }, (_, i) => `v${i}`),
          createdAt: "2026-07-10T00:00:00.000Z",
        }),
      );
      await insertLoadout(
        db,
        loadout({
          id: "l-top2",
          votes: { up: 8 },
          voters: Array.from({ length: 8 }, (_, i) => `v${i}`),
          createdAt: "2026-07-02T00:00:00.000Z",
        }),
      );
      await insertLoadout(
        db,
        loadout({
          id: "l-top3",
          votes: { up: 6 },
          voters: Array.from({ length: 6 }, (_, i) => `v${i}`),
          createdAt: "2026-07-03T00:00:00.000Z",
        }),
      );
      await insertLoadout(
        db,
        loadout({
          id: "l-top4",
          votes: { up: 4 },
          voters: Array.from({ length: 4 }, (_, i) => `v${i}`),
          createdAt: "2026-07-04T00:00:00.000Z",
        }),
      );
      await insertLoadout(
        db,
        loadout({
          id: "l-new1",
          vehicleCode: "golem",
          hardpoints: [
            { hardpointIndex: 0, laserCode: "mystery-laser", moduleCodes: [] },
          ],
          createdAt: "2026-07-12T00:00:00.000Z",
        }),
      );
      await insertLoadout(
        db,
        loadout({ id: "l-new2", createdAt: "2026-07-05T00:00:00.000Z" }),
      );
      // privat: darf nirgends auftauchen, obwohl neuestes und hoch bewertet
      await insertLoadout(
        db,
        loadout({
          id: "priv",
          isPublic: false,
          votes: { up: 99 },
          voters: [],
          createdAt: "2026-07-13T00:00:00.000Z",
        }),
      );
    });

    it("features the top-voted loadout with resolved names", async () => {
      const showcase = await findLoadoutShowcase(db);
      expect(showcase.feature?.loadout.id).toBe("l-feature");
      expect(showcase.feature?.vehicleName).toBe("MOLE");
      expect(showcase.feature?.laserSummary).toBe("2× Helix II");
    });

    it("lists the next three top-voted loadouts after the feature", async () => {
      const showcase = await findLoadoutShowcase(db);
      expect(showcase.top.map((s) => s.loadout.id)).toEqual([
        "l-top2",
        "l-top3",
        "l-top4",
      ]);
    });

    it("lists up to four newest loadouts without the feature", async () => {
      const showcase = await findLoadoutShowcase(db);
      expect(showcase.newest.map((s) => s.loadout.id)).toEqual([
        "l-new1",
        "l-new2",
        "l-top4",
        "l-top3",
      ]);
    });

    it("falls back to raw codes for unknown vehicles and lasers", async () => {
      const showcase = await findLoadoutShowcase(db);
      const unknown = showcase.newest.find((s) => s.loadout.id === "l-new1");
      expect(unknown?.vehicleName).toBe("golem");
      expect(unknown?.laserSummary).toBe("mystery-laser");
    });
  });
});
