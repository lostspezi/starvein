import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import type { ChatMessage } from "./chat.schema";
import {
  capChatHistory,
  insertChatMessage,
  listLatestMessages,
  listMessagesAfter,
} from "./chat.repository";

function buildMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: crypto.randomUUID(),
    userId: "user-1",
    userName: "Miner Joe",
    body: "hallo",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("chat repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("chat"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("inserts and lists latest messages ascending with limit", async () => {
    await insertChatMessage(
      db,
      buildMessage({ body: "erste", createdAt: "2026-07-10T10:00:00.000Z" }),
    );
    await insertChatMessage(
      db,
      buildMessage({ body: "zweite", createdAt: "2026-07-10T10:01:00.000Z" }),
    );
    await insertChatMessage(
      db,
      buildMessage({ body: "dritte", createdAt: "2026-07-10T10:02:00.000Z" }),
    );

    const messages = await listLatestMessages(db, 2);

    expect(messages.map((m) => m.body)).toEqual(["zweite", "dritte"]);
  });

  it("lists only messages after the cursor", async () => {
    await insertChatMessage(
      db,
      buildMessage({ body: "alt", createdAt: "2026-07-10T10:00:00.000Z" }),
    );
    await insertChatMessage(
      db,
      buildMessage({ body: "neu", createdAt: "2026-07-10T10:05:00.000Z" }),
    );

    const messages = await listMessagesAfter(
      db,
      "2026-07-10T10:00:00.000Z",
      50,
    );

    expect(messages.map((m) => m.body)).toEqual(["neu"]);
  });

  it("caps the history to the newest messages", async () => {
    for (let i = 0; i < 5; i++) {
      await insertChatMessage(
        db,
        buildMessage({
          body: `msg-${i}`,
          createdAt: `2026-07-10T10:0${i}:00.000Z`,
        }),
      );
    }

    await capChatHistory(db, 2);

    const messages = await listLatestMessages(db, 50);
    expect(messages.map((m) => m.body)).toEqual(["msg-3", "msg-4"]);
  });
});
