import { afterAll, describe, expect, it } from "vitest";
import { uniqueDbName } from "@/test/factories";
import { closeMongo, getDb, pingMongo } from "./db";

describe("mongo singleton (lib/db)", () => {
  afterAll(async () => {
    await closeMongo();
  });

  it("returns the identical Db instance on repeated calls", async () => {
    const dbName = uniqueDbName("db-singleton");
    const first = await getDb(dbName);
    const second = await getDb(dbName);
    expect(first).toBe(second);
  });

  it("can insert and read back a document", async () => {
    const db = await getDb(uniqueDbName("db-roundtrip"));
    const collection = db.collection("smoke");
    await collection.insertOne({ probe: "starvein" });
    const found = await collection.findOne({ probe: "starvein" });
    expect(found).not.toBeNull();
    expect(found?.probe).toBe("starvein");
  });

  it("pingMongo reports 'up' against a reachable server", async () => {
    await expect(pingMongo(2000)).resolves.toBe("up");
  });
});
