import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import type { ChatMessage } from "./chat.schema";
import {
  capChatHistory,
  deleteChatMessage,
  insertChatMessage,
  listDeletionsAfter,
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

  it("tombstones a deleted message and removes its body", async () => {
    const message = buildMessage({ body: "weg damit" });
    await insertChatMessage(db, message);

    await deleteChatMessage(db, message.id);

    const doc = await db
      .collection("chatMessages")
      .findOne({ id: message.id }, { projection: { _id: 0 } });
    expect(doc?.body).toBeUndefined();
    expect(typeof doc?.deletedAt).toBe("string");
  });

  it("excludes tombstoned messages from both list queries", async () => {
    const kept = buildMessage({
      body: "bleibt",
      createdAt: "2026-07-10T10:00:00.000Z",
    });
    const deleted = buildMessage({
      body: "weg",
      createdAt: "2026-07-10T10:01:00.000Z",
    });
    await insertChatMessage(db, kept);
    await insertChatMessage(db, deleted);
    await deleteChatMessage(db, deleted.id);

    const latest = await listLatestMessages(db, 50);
    expect(latest.map((m) => m.id)).toEqual([kept.id]);

    const after = await listMessagesAfter(db, "2026-07-10T09:00:00.000Z", 50);
    expect(after.map((m) => m.id)).toEqual([kept.id]);
  });

  it("keeps the original deletedAt on double delete", async () => {
    const message = buildMessage();
    await insertChatMessage(db, message);
    await deleteChatMessage(db, message.id);
    // deletedAt auf einen erkennbar alten Wert setzen — ein zweiter Delete
    // darf ihn nicht überschreiben (sonst würde der Deletions-Cursor die
    // Löschung erneut an alle Clients senden)
    await db
      .collection("chatMessages")
      .updateOne(
        { id: message.id },
        { $set: { deletedAt: "2020-01-01T00:00:00.000Z" } },
      );

    await deleteChatMessage(db, message.id);

    const doc = await db.collection("chatMessages").findOne({ id: message.id });
    expect(doc?.deletedAt).toBe("2020-01-01T00:00:00.000Z");
  });

  it("lists deletions from the cursor inclusively (at-least-once)", async () => {
    const first = buildMessage({ createdAt: "2026-07-10T10:00:00.000Z" });
    const second = buildMessage({ createdAt: "2026-07-10T10:01:00.000Z" });
    await insertChatMessage(db, first);
    await insertChatMessage(db, second);
    await deleteChatMessage(db, first.id);
    await deleteChatMessage(db, second.id);

    // Beide deleteChatMessage-Aufrufe können im selben Millisekunden-
    // Zeitstempel landen; Reihenfolge und Cursor-Verhalten müssen dann
    // trotzdem deterministisch sein → Mengen-Vergleich + $gte-Cursor.
    const all = await listDeletionsAfter(db, null);
    expect(new Set(all.map((d) => d.id))).toEqual(
      new Set([first.id, second.id]),
    );
    expect(all.every((d) => typeof d.deletedAt === "string")).toBe(true);

    // At-least-once: die Löschung am Cursor wird erneut zugestellt,
    // damit gleiche Timestamps keine Löschung verschlucken — der
    // Client dedupliziert per id.
    const fromFirst = await listDeletionsAfter(db, all[0].deletedAt);
    expect(new Set(fromFirst.map((d) => d.id))).toEqual(
      new Set([first.id, second.id]),
    );
  });

  it("purges aged-out tombstones via capChatHistory", async () => {
    const old = buildMessage({ createdAt: "2026-07-10T10:00:00.000Z" });
    await insertChatMessage(db, old);
    await deleteChatMessage(db, old.id);
    for (let i = 1; i <= 2; i++) {
      await insertChatMessage(
        db,
        buildMessage({ createdAt: `2026-07-10T10:0${i}:00.000Z` }),
      );
    }

    await capChatHistory(db, 2);

    await expect(listDeletionsAfter(db, null)).resolves.toEqual([]);
  });
});
