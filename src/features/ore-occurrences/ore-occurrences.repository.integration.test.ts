import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  findOccurrencesByLocation,
  findOccurrencesByOre,
  upsertOreOccurrences,
} from "./ore-occurrences.repository";
import type { OreOccurrence } from "./ore-occurrences.schema";

function occurrence(overrides: Partial<OreOccurrence>): OreOccurrence {
  return {
    oreCode: "HADA",
    systemCode: "STANTON",
    bodySlug: "daymar",
    method: "fps",
    probabilityPercent: 30,
    patchVersion: "4.7",
    sourceType: "curated",
    confidenceScore: 0.3,
    lastVerifiedAt: "2026-07-09",
    ...overrides,
  };
}

describe("ore occurrences repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("occurrences"));
    await upsertOreOccurrences(db, [
      occurrence({ bodySlug: "daymar", probabilityPercent: 30 }),
      occurrence({ bodySlug: "lyria", probabilityPercent: 60 }),
      occurrence({ bodySlug: "daymar", method: "roc", probabilityPercent: 45 }),
      occurrence({
        oreCode: "DOLI",
        bodySlug: "daymar",
        probabilityPercent: 50,
      }),
    ]);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("lists occurrences of an ore sorted by probability desc", async () => {
    const results = await findOccurrencesByOre(db, "HADA");
    expect(results.map((o) => [o.bodySlug, o.method])).toEqual([
      ["lyria", "fps"],
      ["daymar", "roc"],
      ["daymar", "fps"],
    ]);
  });

  it("filters ore occurrences by method", async () => {
    const results = await findOccurrencesByOre(db, "HADA", "roc");
    expect(results).toHaveLength(1);
    expect(results[0].method).toBe("roc");
  });

  it("lists occurrences at a location sorted by probability desc", async () => {
    const results = await findOccurrencesByLocation(db, "STANTON", "daymar");
    expect(results.map((o) => [o.oreCode, o.method])).toEqual([
      ["DOLI", "fps"],
      ["HADA", "roc"],
      ["HADA", "fps"],
    ]);
  });

  it("filters location occurrences by method", async () => {
    const results = await findOccurrencesByLocation(
      db,
      "STANTON",
      "daymar",
      "fps",
    );
    expect(results.map((o) => o.oreCode).sort()).toEqual(["DOLI", "HADA"]);
  });

  it("upserts idempotently by ore+location+method+patch", async () => {
    await upsertOreOccurrences(db, [
      occurrence({ bodySlug: "daymar", probabilityPercent: 99 }),
    ]);

    const results = await findOccurrencesByLocation(db, "STANTON", "daymar");
    expect(results).toHaveLength(3);
    expect(
      results.find((o) => o.oreCode === "HADA" && o.method === "fps")
        ?.probabilityPercent,
    ).toBe(99);
  });
});
