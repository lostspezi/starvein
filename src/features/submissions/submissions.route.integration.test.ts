import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/submissions/route";
import { POST as VOTE } from "@/app/api/submissions/vote/route";
import { closeMongo, getDb } from "@/lib/db";

describe("submissions API", () => {
  beforeAll(async () => {
    const db = await getDb();
    await db.collection("submissions").deleteMany({});
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("rejects anonymous submission creation", async () => {
    const response = await POST(
      new Request("http://localhost/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          oreCode: "HADA",
          systemCode: "STANTON",
          bodySlug: "daymar",
          method: "fps",
          probabilityPercent: 42,
        }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects anonymous votes", async () => {
    const response = await VOTE(
      new Request("http://localhost/api/submissions/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ submissionId: "x", value: 1 }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("lists submissions for a location publicly", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/submissions?system=STANTON&body=daymar",
      ),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });

  it("rejects list requests with malformed params", async () => {
    const response = await GET(
      new Request("http://localhost/api/submissions?system=st!&body=Day mar"),
    );
    expect(response.status).toBe(400);
  });
});
