import { ObjectId, type Db } from "mongodb";
import { afterAll, describe, expect, it } from "vitest";
import { incrementUsageDay } from "@/features/public-api/api-usage.repository";
import { closeMongo, getDb } from "@/lib/db";
import {
  KeyCreationBannedError,
  createKey,
  listKeys,
} from "./api-keys.service";
import {
  adminRevokeKey,
  isApiKeyBanned,
  listAllKeysWithOwners,
  setApiKeyBan,
} from "./admin-api-keys.service";

/** Läuft wie der api-keys-Service gegen die Default-DB der Auth-Instanz. */
describe("admin api-keys service", () => {
  afterAll(async () => {
    await closeMongo();
  });

  async function seedUser(db: Db, name: string): Promise<string> {
    const result = await db.collection("user").insertOne({
      name,
      email: `${name.toLowerCase()}-${new ObjectId().toHexString()}@example.com`,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return result.insertedId.toHexString();
  }

  it("lists all keys with owner names and usage totals, never key material", async () => {
    const db = await getDb();
    const ownerId = await seedUser(db, "MinerOne");
    const created = await createKey(db, ownerId, "bot-key");
    await incrementUsageDay(db, {
      keyId: created.id,
      userId: ownerId,
      day: "2026-08-01",
      hour: "09",
      counts: { total: 42, s2xx: 40, s4xx: 1, s429: 1, s5xx: 0 },
      endpoints: { ores: 42 },
    });

    const entries = await listAllKeysWithOwners(db);
    const entry = entries.find((candidate) => candidate.id === created.id);
    expect(entry).toMatchObject({
      name: "bot-key",
      start: created.start,
      totalRequests: 42,
      owner: { id: ownerId, name: "MinerOne", banned: false },
    });
    expect(JSON.stringify(entries)).not.toContain(created.key);
  });

  it("revokes any key regardless of owner", async () => {
    const db = await getDb();
    const ownerId = await seedUser(db, "MinerTwo");
    const created = await createKey(db, ownerId, "to-nuke");

    expect(await adminRevokeKey(db, created.id)).toBe(true);
    expect(await adminRevokeKey(db, created.id)).toBe(false);
    expect(await listKeys(db, ownerId)).toHaveLength(0);
  });

  it("bans a user from creating keys and lifts the ban again", async () => {
    const db = await getDb();
    const ownerId = await seedUser(db, "MinerThree");

    await setApiKeyBan(db, ownerId, true);
    expect(await isApiKeyBanned(db, ownerId)).toBe(true);
    await expect(createKey(db, ownerId, "nope")).rejects.toBeInstanceOf(
      KeyCreationBannedError,
    );

    await setApiKeyBan(db, ownerId, false);
    expect(await isApiKeyBanned(db, ownerId)).toBe(false);
    await expect(createKey(db, ownerId, "now ok")).resolves.toBeDefined();
  });

  it("banning does not touch existing keys", async () => {
    const db = await getDb();
    const ownerId = await seedUser(db, "MinerFour");
    await createKey(db, ownerId, "pre-ban");

    await setApiKeyBan(db, ownerId, true);
    expect(await listKeys(db, ownerId)).toHaveLength(1);
  });
});
