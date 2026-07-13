import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { CURRENT_PATCH_VERSION } from "@/lib/patch";
import { uniqueDbName } from "@/test/factories";
import {
  upsertMiningGadgets,
  upsertMiningLasers,
  upsertMiningModules,
  upsertMiningVehicles,
} from "./equipment.repository";
import type { LoadoutInput } from "./loadouts.schema";
import {
  createLoadout,
  deleteLoadout,
  getLoadoutForViewer,
  LoadoutNotFoundError,
  LoadoutValidationError,
  toggleVote,
  updateLoadout,
} from "./loadouts.service";

const OWNER = "user-owner";
const VISITOR = "user-visitor";

const validInput: LoadoutInput = {
  name: "Quantainium MOLE",
  description: "Helix auf allen Armen",
  method: "ship",
  vehicleCode: "mole",
  hardpoints: [
    { hardpointIndex: 0, laserCode: "helix-ii", moduleCodes: ["rieger-c3"] },
  ],
  gadgetCodes: ["optimax"],
  isPublic: true,
};

async function seedCatalog(db: Db): Promise<void> {
  await upsertMiningVehicles(db, [
    {
      code: "mole",
      name: "MOLE",
      manufacturer: "Argo Astronautics",
      method: "ship",
      hardpoints: [{ size: 2 }, { size: 2 }, { size: 2 }],
      gadgetCapable: true,
      patchVersion: CURRENT_PATCH_VERSION,
    },
    {
      code: "roc",
      name: "ROC",
      manufacturer: "Greycat Industrial",
      method: "roc",
      hardpoints: [{ size: 0 }],
      gadgetCapable: true,
      patchVersion: CURRENT_PATCH_VERSION,
    },
  ]);
  await upsertMiningLasers(db, [
    {
      code: "helix-ii",
      name: "Helix II",
      manufacturer: "Thermyte Concern",
      size: 2,
      moduleSlots: 3,
      stats: {
        laserPower: 4600,
        extractionLaserPower: 900,
        optimalRange: 40,
        maxRange: 80,
      },
      modifiers: {},
      patchVersion: CURRENT_PATCH_VERSION,
    },
  ]);
  await upsertMiningModules(db, [
    {
      code: "rieger-c3",
      name: "Rieger-C3",
      manufacturer: "MISC",
      type: "passive",
      charges: null,
      durationSeconds: null,
      modifiers: { laserPower: 1.32 },
      patchVersion: CURRENT_PATCH_VERSION,
    },
    {
      code: "torpid",
      name: "Torpid",
      manufacturer: "Thermyte Concern",
      type: "passive",
      charges: null,
      durationSeconds: null,
      modifiers: { instability: 0.7 },
      patchVersion: CURRENT_PATCH_VERSION,
    },
  ]);
  await upsertMiningGadgets(db, [
    {
      code: "optimax",
      name: "OptiMax",
      manufacturer: "Shubin Interstellar",
      modifiers: {},
      patchVersion: CURRENT_PATCH_VERSION,
    },
  ]);
}

describe("loadouts service", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("loadouts-service"));
    await seedCatalog(db);
  });

  afterAll(async () => {
    await closeMongo();
  });

  describe("createLoadout", () => {
    it("creates a loadout with server-managed fields stamped", async () => {
      const created = await createLoadout(db, OWNER, validInput);

      expect(created.id).toBeTruthy();
      expect(created.ownerUserId).toBe(OWNER);
      expect(created.patchVersion).toBe(CURRENT_PATCH_VERSION);
      expect(created.votes).toEqual({ up: 0 });
      expect(created.voters).toEqual([]);
      expect(created.createdAt).toBe(created.updatedAt);
    });

    it("rejects incompatible loadouts with the validation error codes", async () => {
      const invalid = {
        ...validInput,
        hardpoints: [
          { hardpointIndex: 5, laserCode: "helix-ii", moduleCodes: [] },
        ],
      };
      await expect(createLoadout(db, OWNER, invalid)).rejects.toThrow(
        LoadoutValidationError,
      );
    });

    it("rejects unknown vehicles", async () => {
      await expect(
        createLoadout(db, OWNER, { ...validInput, vehicleCode: "carrack" }),
      ).rejects.toThrow(LoadoutValidationError);
    });
  });

  describe("updateLoadout", () => {
    it("keeps votes on name/description/visibility changes", async () => {
      const created = await createLoadout(db, OWNER, validInput);
      await toggleVote(db, VISITOR, created.id);

      const renamed = await updateLoadout(db, OWNER, created.id, {
        name: "Neuer Name",
        isPublic: false,
      });

      expect(renamed.name).toBe("Neuer Name");
      expect(renamed.isPublic).toBe(false);
      expect(renamed.votes.up).toBe(1);
      expect(renamed.voters).toEqual([VISITOR]);
    });

    it("resets votes when components change", async () => {
      const created = await createLoadout(db, OWNER, validInput);
      await toggleVote(db, VISITOR, created.id);

      const changed = await updateLoadout(db, OWNER, created.id, {
        hardpoints: [
          { hardpointIndex: 0, laserCode: "helix-ii", moduleCodes: [] },
        ],
      });

      expect(changed.votes.up).toBe(0);
      expect(changed.voters).toEqual([]);
    });

    it("does not reset votes when module order changes", async () => {
      const created = await createLoadout(db, OWNER, {
        ...validInput,
        hardpoints: [
          {
            hardpointIndex: 0,
            laserCode: "helix-ii",
            moduleCodes: ["rieger-c3", "torpid"],
          },
        ],
      });
      await toggleVote(db, VISITOR, created.id);

      const same = await updateLoadout(db, OWNER, created.id, {
        hardpoints: [
          {
            hardpointIndex: 0,
            laserCode: "helix-ii",
            moduleCodes: ["torpid", "rieger-c3"],
          },
        ],
      });

      expect(same.votes.up).toBe(1);
    });

    it("re-validates the merged loadout", async () => {
      const created = await createLoadout(db, OWNER, validInput);
      await expect(
        updateLoadout(db, OWNER, created.id, { vehicleCode: "roc" }),
      ).rejects.toThrow(LoadoutValidationError);
    });

    it("throws NotFound for non-owners", async () => {
      const created = await createLoadout(db, OWNER, validInput);
      await expect(
        updateLoadout(db, VISITOR, created.id, { name: "Gekapert" }),
      ).rejects.toThrow(LoadoutNotFoundError);
    });

    it("throws NotFound for missing loadouts", async () => {
      await expect(
        updateLoadout(db, OWNER, "missing", { name: "x" }),
      ).rejects.toThrow(LoadoutNotFoundError);
    });
  });

  describe("deleteLoadout", () => {
    it("deletes own loadouts", async () => {
      const created = await createLoadout(db, OWNER, validInput);
      await deleteLoadout(db, OWNER, created.id);
      await expect(
        getLoadoutForViewer(db, created.id, OWNER),
      ).resolves.toBeNull();
    });

    it("throws NotFound for non-owners", async () => {
      const created = await createLoadout(db, OWNER, validInput);
      await expect(deleteLoadout(db, VISITOR, created.id)).rejects.toThrow(
        LoadoutNotFoundError,
      );
    });
  });

  describe("toggleVote", () => {
    it("adds and removes a vote on repeated calls", async () => {
      const created = await createLoadout(db, OWNER, validInput);

      const voted = await toggleVote(db, VISITOR, created.id);
      expect(voted.votes.up).toBe(1);
      expect(voted.voters).toEqual([VISITOR]);

      const unvoted = await toggleVote(db, VISITOR, created.id);
      expect(unvoted.votes.up).toBe(0);
      expect(unvoted.voters).toEqual([]);
    });

    it("rejects voting the own loadout", async () => {
      const created = await createLoadout(db, OWNER, validInput);
      await expect(toggleVote(db, OWNER, created.id)).rejects.toThrow(
        LoadoutValidationError,
      );
    });

    it("throws NotFound for private loadouts", async () => {
      const created = await createLoadout(db, OWNER, {
        ...validInput,
        isPublic: false,
      });
      await expect(toggleVote(db, VISITOR, created.id)).rejects.toThrow(
        LoadoutNotFoundError,
      );
    });
  });

  describe("getLoadoutForViewer", () => {
    it("shows public loadouts to everyone", async () => {
      const created = await createLoadout(db, OWNER, validInput);

      await expect(
        getLoadoutForViewer(db, created.id, null),
      ).resolves.toMatchObject({ id: created.id });
      await expect(
        getLoadoutForViewer(db, created.id, VISITOR),
      ).resolves.toMatchObject({ id: created.id });
    });

    it("hides private loadouts from everyone but the owner", async () => {
      const created = await createLoadout(db, OWNER, {
        ...validInput,
        isPublic: false,
      });

      await expect(
        getLoadoutForViewer(db, created.id, OWNER),
      ).resolves.toMatchObject({ id: created.id });
      await expect(
        getLoadoutForViewer(db, created.id, VISITOR),
      ).resolves.toBeNull();
      await expect(
        getLoadoutForViewer(db, created.id, null),
      ).resolves.toBeNull();
    });
  });
});
