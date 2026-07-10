import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ObjectId, type Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  getUserRole,
  listUsers,
  setUserRole,
  setUserRoleByEmail,
} from "./users.repository";

async function insertUser(
  db: Db,
  fields: { name: string; email: string; role?: string },
): Promise<string> {
  const _id = new ObjectId();
  await db.collection("user").insertOne({ _id, ...fields });
  return _id.toHexString();
}

describe("users repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("users"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("lists users with hex ids and defaults missing role to user", async () => {
    const id = await insertUser(db, {
      name: "Miner Joe",
      email: "joe@example.com",
    });
    await insertUser(db, {
      name: "Admin Anna",
      email: "anna@example.com",
      role: "admin",
    });

    const users = await listUsers(db);

    expect(users.map((u) => u.name)).toEqual(["Admin Anna", "Miner Joe"]);
    expect(users[1]).toEqual({
      id,
      name: "Miner Joe",
      email: "joe@example.com",
      role: "user",
    });
    expect(users[0].role).toBe("admin");
  });

  it("reads a user role by hex id", async () => {
    const id = await insertUser(db, {
      name: "Mod Mia",
      email: "mia@example.com",
      role: "moderator",
    });

    await expect(getUserRole(db, id)).resolves.toBe("moderator");
  });

  it("returns null for invalid or unknown ids", async () => {
    await expect(getUserRole(db, "not-an-objectid")).resolves.toBeNull();
    await expect(
      getUserRole(db, new ObjectId().toHexString()),
    ).resolves.toBeNull();
  });

  it("sets a role by hex id", async () => {
    const id = await insertUser(db, {
      name: "Miner Joe",
      email: "joe@example.com",
    });

    await setUserRole(db, id, "moderator");

    await expect(getUserRole(db, id)).resolves.toBe("moderator");
  });

  it("sets a role by email and reports whether a user matched", async () => {
    await insertUser(db, { name: "Miner Joe", email: "joe@example.com" });

    await expect(
      setUserRoleByEmail(db, "joe@example.com", "admin"),
    ).resolves.toBe(true);
    await expect(
      setUserRoleByEmail(db, "nobody@example.com", "admin"),
    ).resolves.toBe(false);

    const users = await listUsers(db);
    expect(users[0].role).toBe("admin");
  });
});
