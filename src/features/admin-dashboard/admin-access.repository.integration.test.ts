import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ObjectId, type Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { resolveDiscordAccountId } from "./admin-access.repository";
import { isDashboardAdminUser } from "./admin-access.service";

const USER_ID = new ObjectId();

describe("resolveDiscordAccountId", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("admin-access"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("returns the discord accountId for the user (userId stored as ObjectId)", async () => {
    await db.collection("account").insertOne({
      userId: USER_ID,
      providerId: "discord",
      accountId: "999000111",
    });

    await expect(
      resolveDiscordAccountId(db, USER_ID.toHexString()),
    ).resolves.toBe("999000111");
  });

  it("also resolves when userId was stored as a plain string (defensive)", async () => {
    const id = new ObjectId();
    await db.collection("account").insertOne({
      userId: id.toHexString(),
      providerId: "discord",
      accountId: "abc123",
    });

    await expect(resolveDiscordAccountId(db, id.toHexString())).resolves.toBe(
      "abc123",
    );
  });

  it("returns null when the user has no discord account", async () => {
    await db.collection("account").insertOne({
      userId: USER_ID,
      providerId: "google",
      accountId: "g-1",
    });

    await expect(
      resolveDiscordAccountId(db, USER_ID.toHexString()),
    ).resolves.toBeNull();
  });

  it("returns null for an invalid / unknown user id", async () => {
    await expect(resolveDiscordAccountId(db, "not-an-id")).resolves.toBeNull();
    await expect(
      resolveDiscordAccountId(db, new ObjectId().toHexString()),
    ).resolves.toBeNull();
  });
});

describe("isDashboardAdminUser", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("admin-access-service"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("is true when the user's discord id is in ADMIN_DISCORD_IDS", async () => {
    await db.collection("account").insertOne({
      userId: USER_ID,
      providerId: "discord",
      accountId: "555",
    });

    await expect(
      isDashboardAdminUser(db, USER_ID.toHexString(), {
        ADMIN_DISCORD_IDS: "111,555,222",
      }),
    ).resolves.toBe(true);
  });

  it("is false when the discord id is not listed", async () => {
    await db.collection("account").insertOne({
      userId: USER_ID,
      providerId: "discord",
      accountId: "555",
    });

    await expect(
      isDashboardAdminUser(db, USER_ID.toHexString(), {
        ADMIN_DISCORD_IDS: "111,222",
      }),
    ).resolves.toBe(false);
  });

  it("is fail-closed when the allowlist is empty (no DB call needed)", async () => {
    await expect(
      isDashboardAdminUser(db, USER_ID.toHexString(), {
        ADMIN_DISCORD_IDS: "",
      }),
    ).resolves.toBe(false);
  });
});
