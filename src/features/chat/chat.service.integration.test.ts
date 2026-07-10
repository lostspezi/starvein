import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { CHAT_MESSAGE_MAX_LENGTH } from "./chat.schema";
import {
  ChatValidationError,
  listChatMessages,
  postChatMessage,
} from "./chat.service";

const USER = { id: "user-1", name: "Miner Joe" };

async function expectRejection(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  await expect(promise).rejects.toSatisfy(
    (error) => error instanceof ChatValidationError && error.code === code,
  );
}

describe("chat service", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("chat-service"));
    // Ohne REDIS_URL ist der Duplikat-Check ein No-Op (best effort)
    delete process.env.REDIS_URL;
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("rejects a blank body with code empty", async () => {
    await expectRejection(postChatMessage(db, USER, "   "), "empty");
  });

  it("rejects an overlong body with code tooLong", async () => {
    const body = "a".repeat(CHAT_MESSAGE_MAX_LENGTH + 1);
    await expectRejection(postChatMessage(db, USER, body), "tooLong");
  });

  it("rejects links with code linkBlocked", async () => {
    await expectRejection(
      postChatMessage(db, USER, "kauft bei https://spam.example"),
      "linkBlocked",
    );
  });

  it("rejects caps spam with code excessiveCaps", async () => {
    await expectRejection(
      postChatMessage(db, USER, "KAUFT ALLE MEINE ERZE SOFORT JETZT"),
      "excessiveCaps",
    );
  });

  it("rejects repeated character runs with code repeatedChars", async () => {
    await expectRejection(
      postChatMessage(db, USER, "haaaaaaaaallo"),
      "repeatedChars",
    );
  });

  it("masks bad words and persists the masked body with userName snapshot", async () => {
    const message = await postChatMessage(db, USER, "so ein Arschloch hier");

    expect(message.body).toBe("so ein *** hier");
    expect(message.userName).toBe("Miner Joe");
    expect(message.userId).toBe("user-1");
    expect(message.id).toBeTruthy();

    const stored = await listChatMessages(db, null, 50);
    expect(stored).toHaveLength(1);
    expect(stored[0].body).toBe("so ein *** hier");
  });

  it("trims whitespace before storing", async () => {
    const message = await postChatMessage(db, USER, "  hallo zusammen  ");

    expect(message.body).toBe("hallo zusammen");
  });

  it("lists messages after a cursor", async () => {
    const first = await postChatMessage(db, USER, "erste Nachricht");
    const second = await postChatMessage(db, USER, "zweite Nachricht");

    const newer = await listChatMessages(db, first.createdAt, 50);

    expect(newer.map((m) => m.id)).toEqual(
      second.createdAt > first.createdAt ? [second.id] : [],
    );
  });
});
