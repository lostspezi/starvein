import { afterAll, describe, expect, it } from "vitest";
import { POST as CREATE } from "@/app/api/guides/route";
import { DELETE, PATCH } from "@/app/api/guides/[id]/route";
import { POST as UPLOAD } from "@/app/api/guides/images/route";
import { POST as VOTE } from "@/app/api/guides/[id]/vote/route";
import { closeMongo } from "@/lib/db";

const params = { params: Promise.resolve({ id: "guide-1" }) };

// Ohne Session-Cookie müssen alle Guide-Mutationen 401 liefern — der Happy
// Path ist über die Service-Tests und die UI abgedeckt.
describe("guides API without a session", () => {
  afterAll(async () => {
    await closeMongo();
  });

  it("rejects anonymous creation", async () => {
    const response = await CREATE(
      new Request("http://localhost/api/guides", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tags: [],
          isPublic: false,
          translations: [
            { language: "en", title: "Test", content: { type: "doc" } },
          ],
        }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects anonymous edits", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/guides/guide-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isPublic: true }),
      }),
      params,
    );
    expect(response.status).toBe(401);
  });

  it("rejects anonymous deletes", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/guides/guide-1", { method: "DELETE" }),
      params,
    );
    expect(response.status).toBe(401);
  });

  it("rejects anonymous votes", async () => {
    const response = await VOTE(
      new Request("http://localhost/api/guides/guide-1/vote", {
        method: "POST",
      }),
      params,
    );
    expect(response.status).toBe(401);
  });

  it("rejects anonymous image uploads", async () => {
    const response = await UPLOAD(
      new Request("http://localhost/api/guides/images", { method: "POST" }),
    );
    expect(response.status).toBe(401);
  });
});
