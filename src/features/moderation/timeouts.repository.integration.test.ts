import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  getActiveChatTimeout,
  listActiveTimeouts,
  revokeChatTimeout,
  upsertChatTimeout,
} from "./timeouts.repository";

const NOW = "2026-07-10T12:00:00.000Z";

describe("timeouts repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("timeouts"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("upserts and reads an active timeout", async () => {
    await upsertChatTimeout(db, {
      userId: "user-1",
      userName: "Miner Joe",
      until: "2026-07-10T12:05:00.000Z",
      byUserId: "mod-1",
    });

    const active = await getActiveChatTimeout(db, "user-1", NOW);

    expect(active?.until).toBe("2026-07-10T12:05:00.000Z");
    expect(active?.byUserId).toBe("mod-1");
  });

  it("replaces an existing timeout for the same user", async () => {
    await upsertChatTimeout(db, {
      userId: "user-1",
      userName: "Miner Joe",
      until: "2026-07-10T12:05:00.000Z",
      byUserId: "mod-1",
    });
    await upsertChatTimeout(db, {
      userId: "user-1",
      userName: "Miner Joe",
      until: "2026-07-11T12:00:00.000Z",
      byUserId: "mod-2",
    });

    const all = await db.collection("chatTimeouts").find({}).toArray();
    expect(all).toHaveLength(1);
    expect(all[0].until).toBe("2026-07-11T12:00:00.000Z");
  });

  it("returns null for expired timeouts and exactly at until", async () => {
    await upsertChatTimeout(db, {
      userId: "user-1",
      userName: "Miner Joe",
      until: "2026-07-10T11:00:00.000Z",
      byUserId: "mod-1",
    });

    await expect(getActiveChatTimeout(db, "user-1", NOW)).resolves.toBeNull();
    // Grenzfall: exakt bei until darf wieder gesendet werden (strikt $gt)
    await expect(
      getActiveChatTimeout(db, "user-1", "2026-07-10T11:00:00.000Z"),
    ).resolves.toBeNull();
  });

  it("lists only active timeouts", async () => {
    await upsertChatTimeout(db, {
      userId: "user-1",
      userName: "Miner Joe",
      until: "2026-07-10T13:00:00.000Z",
      byUserId: "mod-1",
    });
    await upsertChatTimeout(db, {
      userId: "user-2",
      userName: "Rock Hound",
      until: "2026-07-10T11:00:00.000Z",
      byUserId: "mod-1",
    });

    const active = await listActiveTimeouts(db, NOW);

    expect(active.map((t) => t.userId)).toEqual(["user-1"]);
  });

  it("revokes a timeout (idempotent)", async () => {
    await upsertChatTimeout(db, {
      userId: "user-1",
      userName: "Miner Joe",
      until: "2026-07-10T13:00:00.000Z",
      byUserId: "mod-1",
    });

    await revokeChatTimeout(db, "user-1");
    await revokeChatTimeout(db, "user-1");

    await expect(getActiveChatTimeout(db, "user-1", NOW)).resolves.toBeNull();
  });
});
