import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/ores/route";
import { closeMongo, getDb } from "@/lib/db";
import { upsertOres } from "./ores.repository";
import type { Ore } from "./ores.schema";

const gold: Ore = {
  code: "GOLD",
  name_de: "Gold",
  name_en: "Gold",
  rarityTier: "rare",
  mineableBy: { ship: true, roc: false, fps: false },
};

const req = () => new Request("http://localhost/api/ores");

describe("GET /api/ores", () => {
  beforeEach(async () => {
    const db = await getDb();
    await db.collection("ores").deleteMany({});
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("returns an empty array when no ores exist", async () => {
    const response = await GET(req());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });

  it("returns seeded ores", async () => {
    await upsertOres(await getDb(), [gold]);

    const response = await GET(req());
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toEqual(gold);
  });
});
