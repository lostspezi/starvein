import { afterAll, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/chat/messages/route";
import { closeMongo } from "@/lib/db";

// GET ist öffentlich (CIG-Regel: Browsen ohne Account). POST verlangt
// eine Session — der Happy Path ist über die Service-Tests abgedeckt.
describe("chat messages API", () => {
  afterAll(async () => {
    await closeMongo();
  });

  it("serves GET publicly without a session", async () => {
    const response = await GET(
      new Request("http://localhost/api/chat/messages"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      messages: [],
      deletions: [],
    });
  });

  it("rejects an invalid after cursor", async () => {
    const response = await GET(
      new Request("http://localhost/api/chat/messages?after=not-a-date"),
    );

    expect(response.status).toBe(400);
  });

  it("rejects an invalid deletedAfter cursor", async () => {
    const response = await GET(
      new Request("http://localhost/api/chat/messages?deletedAfter=nope"),
    );

    expect(response.status).toBe(400);
  });

  it("rejects an out-of-range limit", async () => {
    const response = await GET(
      new Request("http://localhost/api/chat/messages?limit=1000"),
    );

    expect(response.status).toBe(400);
  });

  it("rejects POST without a session", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: "hallo" }),
      }),
    );

    expect(response.status).toBe(401);
  });
});
