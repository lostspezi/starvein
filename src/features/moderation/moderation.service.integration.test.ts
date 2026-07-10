import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ObjectId, type Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { insertChatMessage } from "@/features/chat/chat.repository";
import {
  applyChatTimeout,
  changeUserRole,
  deleteChatMessageAsModerator,
  ModerationError,
  revokeChatTimeoutAsModerator,
} from "./moderation.service";
import { getActiveChatTimeout } from "./timeouts.repository";
import { getUserRole } from "./users.repository";

async function insertUser(
  db: Db,
  fields: { name: string; role?: string },
): Promise<string> {
  const _id = new ObjectId();
  await db
    .collection("user")
    .insertOne({ _id, email: `${_id.toHexString()}@example.com`, ...fields });
  return _id.toHexString();
}

async function expectModerationError(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  await expect(promise).rejects.toSatisfy(
    (error) => error instanceof ModerationError && error.code === code,
  );
}

const MOD = { id: "mod-1", role: "moderator" } as const;
const PLAIN = { id: "user-1", role: "user" } as const;

describe("moderation service", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("moderation"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  describe("deleteChatMessageAsModerator", () => {
    it("rejects requesters without moderation rights", async () => {
      await expectModerationError(
        deleteChatMessageAsModerator(db, PLAIN, "msg-1"),
        "forbidden",
      );
    });

    it("tombstones the message for moderators", async () => {
      await insertChatMessage(db, {
        id: "msg-1",
        userId: "user-1",
        userName: "Miner Joe",
        body: "weg damit",
        createdAt: new Date().toISOString(),
      });

      await deleteChatMessageAsModerator(db, MOD, "msg-1");

      const doc = await db.collection("chatMessages").findOne({ id: "msg-1" });
      expect(doc?.body).toBeUndefined();
      expect(typeof doc?.deletedAt).toBe("string");
    });
  });

  describe("applyChatTimeout", () => {
    it("rejects requesters without moderation rights", async () => {
      const target = await insertUser(db, { name: "Miner Joe" });
      await expectModerationError(
        applyChatTimeout(db, PLAIN, target, 5),
        "forbidden",
      );
    });

    it("rejects self-timeout", async () => {
      const requesterId = await insertUser(db, {
        name: "Mod Mia",
        role: "moderator",
      });
      await expectModerationError(
        applyChatTimeout(
          db,
          { id: requesterId, role: "moderator" },
          requesterId,
          5,
        ),
        "cannotModerate",
      );
    });

    it("rejects moderator and admin targets", async () => {
      const otherMod = await insertUser(db, {
        name: "Mod Max",
        role: "moderator",
      });
      await expectModerationError(
        applyChatTimeout(db, MOD, otherMod, 5),
        "cannotModerate",
      );
    });

    it("rejects unknown targets", async () => {
      await expectModerationError(
        applyChatTimeout(db, MOD, new ObjectId().toHexString(), 5),
        "notFound",
      );
    });

    it("upserts a timeout with the computed until", async () => {
      const target = await insertUser(db, { name: "Miner Joe" });
      const before = Date.now();

      const { until } = await applyChatTimeout(db, MOD, target, 5);

      const expectedMin = before + 5 * 60_000;
      expect(Date.parse(until)).toBeGreaterThanOrEqual(expectedMin - 1000);
      expect(Date.parse(until)).toBeLessThanOrEqual(expectedMin + 10_000);

      const active = await getActiveChatTimeout(
        db,
        target,
        new Date().toISOString(),
      );
      expect(active?.byUserId).toBe(MOD.id);
      expect(active?.userName).toBe("Miner Joe");
    });
  });

  describe("revokeChatTimeoutAsModerator", () => {
    it("rejects requesters without moderation rights", async () => {
      await expectModerationError(
        revokeChatTimeoutAsModerator(db, PLAIN, "user-1"),
        "forbidden",
      );
    });

    it("revokes an active timeout", async () => {
      const target = await insertUser(db, { name: "Miner Joe" });
      await applyChatTimeout(db, MOD, target, 5);

      await revokeChatTimeoutAsModerator(db, MOD, target);

      await expect(
        getActiveChatTimeout(db, target, new Date().toISOString()),
      ).resolves.toBeNull();
    });
  });

  describe("changeUserRole", () => {
    it("rejects non-admin requesters", async () => {
      const target = await insertUser(db, { name: "Miner Joe" });
      await expectModerationError(
        changeUserRole(
          db,
          { id: "mod-1", role: "moderator" },
          target,
          "moderator",
        ),
        "forbidden",
      );
    });

    it("rejects self-demotion", async () => {
      const adminId = await insertUser(db, { name: "Admin", role: "admin" });
      await expectModerationError(
        changeUserRole(db, { id: adminId, role: "admin" }, adminId, "user"),
        "cannotModerate",
      );
    });

    it("rejects admin targets", async () => {
      const otherAdmin = await insertUser(db, {
        name: "Other Admin",
        role: "admin",
      });
      await expectModerationError(
        changeUserRole(
          db,
          { id: "admin-1", role: "admin" },
          otherAdmin,
          "user",
        ),
        "cannotModerate",
      );
    });

    it("rejects unknown targets", async () => {
      await expectModerationError(
        changeUserRole(
          db,
          { id: "admin-1", role: "admin" },
          new ObjectId().toHexString(),
          "moderator",
        ),
        "notFound",
      );
    });

    it("promotes a user to moderator and back", async () => {
      const target = await insertUser(db, { name: "Miner Joe" });
      const admin = { id: "admin-1", role: "admin" } as const;

      await changeUserRole(db, admin, target, "moderator");
      await expect(getUserRole(db, target)).resolves.toBe("moderator");

      await changeUserRole(db, admin, target, "user");
      await expect(getUserRole(db, target)).resolves.toBe("user");
    });
  });
});
