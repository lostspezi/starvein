import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  findAllOccurrences,
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

  it("lists all occurrences sorted by probability desc", async () => {
    const all = await findAllOccurrences(db, {});
    expect(all).toHaveLength(4);
    expect(all[0].probabilityPercent).toBe(60);
    expect(all.map((o) => o.probabilityPercent)).toEqual([60, 50, 45, 30]);
  });

  it("filters all occurrences by method, system and ore", async () => {
    const rocOnly = await findAllOccurrences(db, { method: "roc" });
    expect(rocOnly).toHaveLength(1);
    expect(rocOnly[0].method).toBe("roc");

    const stanton = await findAllOccurrences(db, { systemCode: "STANTON" });
    expect(stanton).toHaveLength(4);

    const doliFps = await findAllOccurrences(db, {
      oreCode: "DOLI",
      method: "fps",
    });
    expect(doliFps).toHaveLength(1);
    expect(doliFps[0].oreCode).toBe("DOLI");
  });

  it("filters all occurrences by deposit type", async () => {
    await upsertOreOccurrences(db, [
      occurrence({
        oreCode: "BORA",
        bodySlug: "hur-l1",
        method: "ship",
        probabilityPercent: 10,
        depositType: "primary",
      }),
      occurrence({
        oreCode: "BORA",
        bodySlug: "cru-l1",
        method: "ship",
        probabilityPercent: 30,
        depositType: "secondary",
      }),
    ]);

    // primary schließt nur explizite secondary aus — Docs ohne Feld bleiben
    const primary = await findAllOccurrences(db, { deposit: "primary" });
    expect(primary.some((o) => o.depositType === "secondary")).toBe(false);
    expect(primary).toHaveLength(5);

    const secondary = await findAllOccurrences(db, { deposit: "secondary" });
    expect(secondary).toHaveLength(1);
    expect(secondary[0].bodySlug).toBe("cru-l1");
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
