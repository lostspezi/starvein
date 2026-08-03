import { ObjectId } from "mongodb";
import { afterAll, describe, expect, it } from "vitest";
import { closeMongo, getDb } from "@/lib/db";
import { API_KEY_PREFIX, MAX_API_KEYS_PER_USER } from "@/lib/api-key-plugin";
import {
  KeyLimitError,
  createKey,
  findKeySummary,
  listKeys,
  revokeKey,
} from "./api-keys.service";

/**
 * Läuft gegen die echte Auth-Instanz (src/lib/auth.ts) und deren
 * Default-DB — Isolation über zufällige userIds statt eigener DB,
 * weil das apiKey-Plugin an die Auth-DB gebunden ist.
 */
describe("api-keys service", () => {
  const userId = () => new ObjectId().toHexString();

  afterAll(async () => {
    await closeMongo();
  });

  it("creates a key and returns the full key exactly once", async () => {
    const db = await getDb();
    const owner = userId();

    const created = await createKey(db, owner, "Mein Bot");
    expect(created.key).toMatch(new RegExp(`^${API_KEY_PREFIX}`));
    expect(created.name).toBe("Mein Bot");
    expect(created.start).toBe(created.key.slice(0, 8));

    const listed = await listKeys(db, owner);
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      id: created.id,
      name: "Mein Bot",
      start: created.start,
      lastUsedAt: null,
    });
    // Liste enthält niemals das volle Key-Material
    expect(JSON.stringify(listed)).not.toContain(created.key);
  });

  it("enforces the per-user key limit", async () => {
    const db = await getDb();
    const owner = userId();

    for (let i = 0; i < MAX_API_KEYS_PER_USER; i += 1) {
      await createKey(db, owner, `key-${i}`);
    }
    await expect(createKey(db, owner, "one too many")).rejects.toBeInstanceOf(
      KeyLimitError,
    );
    // Ein anderer Nutzer ist vom Limit nicht betroffen
    await expect(createKey(db, userId(), "fresh")).resolves.toBeDefined();
  });

  it("revokes only keys owned by the user", async () => {
    const db = await getDb();
    const owner = userId();
    const stranger = userId();

    const created = await createKey(db, owner, "to revoke");
    expect(await revokeKey(db, stranger, created.id)).toBe(false);
    expect(await listKeys(db, owner)).toHaveLength(1);

    expect(await revokeKey(db, owner, created.id)).toBe(true);
    expect(await listKeys(db, owner)).toHaveLength(0);
  });

  it("finds a key summary only for its owner", async () => {
    const db = await getDb();
    const owner = userId();
    const created = await createKey(db, owner, "mine");

    const found = await findKeySummary(db, owner, created.id);
    expect(found).toMatchObject({ id: created.id, name: "mine" });

    expect(await findKeySummary(db, userId(), created.id)).toBeNull();
    expect(await findKeySummary(db, owner, "not-an-object-id")).toBeNull();
  });

  it("returns false when revoking an unknown or malformed key id", async () => {
    const db = await getDb();
    const owner = userId();
    expect(await revokeKey(db, owner, new ObjectId().toHexString())).toBe(
      false,
    );
    expect(await revokeKey(db, owner, "not-an-object-id")).toBe(false);
  });
});
