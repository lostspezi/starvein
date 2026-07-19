import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  ensureLocationGuideIndexes,
  findLocationGuide,
  upsertLocationGuides,
} from "./location-guides.repository";
import type { LocationGuide } from "./location-guides.schema";

const glaciem: LocationGuide = {
  systemCode: "NYX",
  bodySlug: "glaciem-ring",
  note_de: "Nach Nyx springen, per Quantum zu Delamar.",
  note_en: "Jump into Nyx, quantum travel to Delamar.",
};

describe("location guides repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("location-guides"));
    await upsertLocationGuides(db, [glaciem]);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("finds a guide by system + body slug", async () => {
    const guide = await findLocationGuide(db, "NYX", "glaciem-ring");
    expect(guide).toEqual(glaciem);
  });

  it("returns null for a body without a guide", async () => {
    const guide = await findLocationGuide(db, "NYX", "keeger-belt");
    expect(guide).toBeNull();
  });

  it("upserts idempotently by system + slug", async () => {
    await upsertLocationGuides(db, [{ ...glaciem, note_en: "Updated route." }]);

    const guide = await findLocationGuide(db, "NYX", "glaciem-ring");
    expect(guide?.note_en).toBe("Updated route.");
    expect(await db.collection("locationGuides").countDocuments()).toBe(1);
  });

  it("enforces a unique index on system + slug", async () => {
    await ensureLocationGuideIndexes(db);
    await expect(
      db.collection("locationGuides").insertOne({ ...glaciem }),
    ).rejects.toThrow();
  });
});
