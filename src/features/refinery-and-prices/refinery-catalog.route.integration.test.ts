import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET as GET_TERMINALS } from "@/app/api/refinery-terminals/route";
import { GET as GET_METHODS } from "@/app/api/refinery-methods/route";
import { closeMongo, getDb } from "@/lib/db";

/**
 * Öffentliche Katalog-Endpunkte für die Desktop-App (Slice D2): liefern die
 * gültigen terminalId/methodCode-Werte für die Job-Erfassung — ohne Session,
 * wie GET /api/ores (reines Referenz-Browsing, CLAUDE.md §2).
 */
describe("refinery catalog routes", () => {
  beforeEach(async () => {
    const db = await getDb();
    await db.collection("refineryYields").deleteMany({});
    await db.collection("refineryMethods").deleteMany({});
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("returns empty arrays when nothing is synced", async () => {
    const terminals = await GET_TERMINALS();
    expect(terminals.status).toBe(200);
    await expect(terminals.json()).resolves.toEqual([]);

    const methods = await GET_METHODS();
    expect(methods.status).toBe(200);
    await expect(methods.json()).resolves.toEqual([]);
  });

  it("returns synced terminals and methods", async () => {
    const db = await getDb();
    await db.collection("refineryYields").insertOne({
      oreCode: "QUAN",
      terminalId: 32,
      terminalName: "ARC-L1 Wide Forest Station",
      starSystemName: "Stanton",
      bonusPercent: 5,
      syncedAt: "2026-07-14T08:00:00.000Z",
    });
    await db.collection("refineryMethods").insertOne({
      code: "DINYX",
      name: "Dinyx Solventation",
      ratingYield: 3,
      ratingCost: 1,
      ratingSpeed: 1,
      syncedAt: "2026-07-14T08:00:00.000Z",
    });

    const terminals = await (await GET_TERMINALS()).json();
    expect(terminals).toEqual([
      {
        terminalId: 32,
        terminalName: "ARC-L1 Wide Forest Station",
        starSystemName: "Stanton",
      },
    ]);

    const methods = await (await GET_METHODS()).json();
    expect(methods).toHaveLength(1);
    expect(methods[0]).toMatchObject({
      code: "DINYX",
      name: "Dinyx Solventation",
    });
  });
});
