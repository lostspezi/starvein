import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { listRefineryMethods, listRefineryTerminals } from "./refinery-catalog";
import type {
  RefineryMethod,
  RefineryYield,
} from "./refinery-and-prices.schema";

const SYNCED_AT = "2026-07-14T08:00:00.000Z";

function makeYield(overrides: Partial<RefineryYield> = {}): RefineryYield {
  return {
    oreCode: "QUAN",
    terminalId: 32,
    terminalName: "ARC-L1 Wide Forest Station",
    starSystemName: "Stanton",
    bonusPercent: 5,
    syncedAt: SYNCED_AT,
    ...overrides,
  };
}

function makeMethod(overrides: Partial<RefineryMethod> = {}): RefineryMethod {
  return {
    code: "DINYX",
    name: "Dinyx Solventation",
    ratingYield: 3,
    ratingCost: 1,
    ratingSpeed: 1,
    syncedAt: SYNCED_AT,
    ...overrides,
  };
}

describe("refinery catalog", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("refinery-catalog"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("lists distinct terminals sorted by name", async () => {
    await db.collection("refineryYields").insertMany([
      makeYield({ oreCode: "QUAN" }),
      makeYield({ oreCode: "GOLD" }), // gleicher Terminal, anderes Erz
      makeYield({
        terminalId: 12,
        terminalName: "CRU-L1 Ambitious Dream Station",
        oreCode: "QUAN",
      }),
      makeYield({
        terminalId: 90,
        terminalName: "Checkmate Station",
        starSystemName: "Pyro",
      }),
    ]);

    const terminals = await listRefineryTerminals(db);

    expect(terminals).toEqual([
      {
        terminalId: 32,
        terminalName: "ARC-L1 Wide Forest Station",
        starSystemName: "Stanton",
      },
      {
        terminalId: 90,
        terminalName: "Checkmate Station",
        starSystemName: "Pyro",
      },
      {
        terminalId: 12,
        terminalName: "CRU-L1 Ambitious Dream Station",
        starSystemName: "Stanton",
      },
    ]);
  });

  it("returns an empty list when nothing is synced", async () => {
    await expect(listRefineryTerminals(db)).resolves.toEqual([]);
    await expect(listRefineryMethods(db)).resolves.toEqual([]);
  });

  it("lists refinery methods sorted by name", async () => {
    await db
      .collection("refineryMethods")
      .insertMany([
        makeMethod({ code: "FERRON", name: "Ferron Exchange" }),
        makeMethod(),
      ]);

    const methods = await listRefineryMethods(db);

    expect(methods.map((m) => m.code)).toEqual(["DINYX", "FERRON"]);
    expect(methods[0]).toMatchObject({ ratingYield: 3, ratingSpeed: 1 });
  });
});
