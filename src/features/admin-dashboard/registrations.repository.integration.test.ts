import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ObjectId, type Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { getRegistrationStats } from "./registrations.repository";

const NOW = new Date("2026-07-20T12:00:00.000Z");

function daysAgo(days: number, hours = 0): Date {
  return new Date(NOW.getTime() - days * 86_400_000 - hours * 3_600_000);
}

const U1 = new ObjectId();
const U2 = new ObjectId();
const U3 = new ObjectId();
const U4 = new ObjectId();

async function seed(db: Db) {
  await db.collection("user").insertMany([
    { _id: U1, name: "Aria", createdAt: daysAgo(0, 1) }, // <24h
    { _id: U2, name: "Bran", createdAt: daysAgo(2) }, // <7d
    { _id: U3, name: "Cass", createdAt: daysAgo(10) }, // <30d
    { _id: U4, name: "Dex", createdAt: daysAgo(40) }, // >30d
  ]);
  await db.collection("account").insertMany([
    { userId: U1, providerId: "discord", accountId: "1" },
    { userId: U2, providerId: "discord", accountId: "2" },
    { userId: U3, providerId: "google", accountId: "3" },
    { userId: U4, providerId: "discord", accountId: "4" },
  ]);
  await db.collection("session").insertMany([
    { userId: U1, expiresAt: new Date(NOW.getTime() + 3_600_000) }, // active
    { userId: U2, expiresAt: new Date(NOW.getTime() - 3_600_000) }, // expired
  ]);
}

describe("getRegistrationStats", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("registrations"));
    await seed(db);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("counts total users and recent-window signups", async () => {
    const stats = await getRegistrationStats(db, NOW);
    expect(stats.totalUsers).toBe(4);
    expect(stats.newLast24h).toBe(1);
    expect(stats.newLast7d).toBe(2);
    expect(stats.newLast30d).toBe(3);
  });

  it("counts only unexpired sessions as active", async () => {
    const stats = await getRegistrationStats(db, NOW);
    expect(stats.activeSessions).toBe(1);
  });

  it("breaks registrations down by provider", async () => {
    const stats = await getRegistrationStats(db, NOW);
    const map = Object.fromEntries(
      stats.byProvider.map((p) => [p.provider, p.count]),
    );
    expect(map).toEqual({ discord: 3, google: 1 });
  });

  it("returns a zero-filled 30-day signup series", async () => {
    const stats = await getRegistrationStats(db, NOW);
    expect(stats.dailySignups).toHaveLength(30);
    const byDate = Object.fromEntries(
      stats.dailySignups.map((d) => [d.date, d.count]),
    );
    expect(byDate["2026-07-20"]).toBe(1); // U1
    expect(byDate["2026-07-18"]).toBe(1); // U2
    expect(byDate["2026-07-10"]).toBe(1); // U3
    expect(byDate["2026-07-19"]).toBe(0); // gap is zero-filled
    // last entry is "today", first is 29 days earlier
    expect(stats.dailySignups.at(-1)?.date).toBe("2026-07-20");
    expect(stats.dailySignups.at(0)?.date).toBe("2026-06-21");
  });

  it("lists the most recent signups newest-first with their provider", async () => {
    const stats = await getRegistrationStats(db, NOW, { recentLimit: 3 });
    expect(stats.recentSignups.map((s) => s.name)).toEqual([
      "Aria",
      "Bran",
      "Cass",
    ]);
    expect(stats.recentSignups[0]).toMatchObject({
      name: "Aria",
      provider: "discord",
    });
    expect(typeof stats.recentSignups[0].createdAt).toBe("string");
  });
});
