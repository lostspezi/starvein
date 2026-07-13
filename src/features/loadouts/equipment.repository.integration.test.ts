import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import type {
  MiningGadget,
  MiningLaser,
  MiningModule,
  MiningVehicle,
} from "./equipment.schema";
import {
  findAllMiningGadgets,
  findAllMiningLasers,
  findAllMiningModules,
  findAllMiningVehicles,
  findVehicleByCode,
  loadEquipmentCatalog,
  upsertMiningGadgets,
  upsertMiningLasers,
  upsertMiningModules,
  upsertMiningVehicles,
} from "./equipment.repository";

const patchVersion = "4.7";

const prospector: MiningVehicle = {
  code: "prospector",
  name: "Prospector",
  manufacturer: "MISC",
  method: "ship",
  hardpoints: [{ size: 1 }],
  gadgetCapable: true,
  patchVersion,
};

const helixI: MiningLaser = {
  code: "helix-i",
  name: "Helix I",
  manufacturer: "Thermyte Concern",
  size: 1,
  moduleSlots: 3,
  stats: {
    laserPower: 2900,
    extractionLaserPower: 570,
    optimalRange: 30,
    maxRange: 60,
  },
  modifiers: {},
  patchVersion,
};

const riegerC3: MiningModule = {
  code: "rieger-c3",
  name: "Rieger-C3",
  manufacturer: "MISC",
  type: "passive",
  charges: null,
  durationSeconds: null,
  modifiers: { laserPower: 1.32 },
  patchVersion,
};

const optimax: MiningGadget = {
  code: "optimax",
  name: "OptiMax",
  manufacturer: "Shubin Interstellar",
  modifiers: {},
  patchVersion,
};

describe("equipment repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("equipment"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("upserts vehicles idempotently and finds them by code", async () => {
    await upsertMiningVehicles(db, [prospector]);
    await upsertMiningVehicles(db, [prospector]);

    await expect(findAllMiningVehicles(db)).resolves.toEqual([prospector]);
    await expect(findVehicleByCode(db, "prospector")).resolves.toEqual(
      prospector,
    );
    await expect(findVehicleByCode(db, "mole")).resolves.toBeNull();
  });

  it("round-trips lasers, modules and gadgets", async () => {
    await upsertMiningLasers(db, [helixI]);
    await upsertMiningModules(db, [riegerC3]);
    await upsertMiningGadgets(db, [optimax]);

    await expect(findAllMiningLasers(db)).resolves.toEqual([helixI]);
    await expect(findAllMiningModules(db)).resolves.toEqual([riegerC3]);
    await expect(findAllMiningGadgets(db)).resolves.toEqual([optimax]);
  });

  it("does nothing on empty upserts", async () => {
    await upsertMiningVehicles(db, []);
    await expect(findAllMiningVehicles(db)).resolves.toEqual([]);
  });

  it("loads the full catalog in one call", async () => {
    await upsertMiningVehicles(db, [prospector]);
    await upsertMiningLasers(db, [helixI]);
    await upsertMiningModules(db, [riegerC3]);
    await upsertMiningGadgets(db, [optimax]);

    await expect(loadEquipmentCatalog(db)).resolves.toEqual({
      vehicles: [prospector],
      lasers: [helixI],
      modules: [riegerC3],
      gadgets: [optimax],
    });
  });
});
