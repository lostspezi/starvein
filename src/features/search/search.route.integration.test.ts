import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET } from "@/app/api/search/route";
import { upsertCelestialBodies } from "@/features/locations/locations.repository";
import { closeMongo, getDb } from "@/lib/db";

function request(query: string | null): Request {
  const url = new URL("http://localhost/api/search");
  if (query !== null) url.searchParams.set("q", query);
  return new Request(url);
}

describe("GET /api/search", () => {
  beforeAll(async () => {
    const db = await getDb();
    await db.collection("celestialBodies").deleteMany({});
    await upsertCelestialBodies(db, [
      {
        slug: "yela",
        systemCode: "STANTON",
        type: "moon",
        name: "Yela",
        parentSlug: "crusader",
        uexId: 75,
      },
    ]);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("returns matching results as JSON", async () => {
    const response = await GET(request("yela"));
    expect(response.status).toBe(200);

    const results = await response.json();
    expect(results).toContainEqual({
      kind: "body",
      label: "Yela",
      detail: "moon",
      href: "/locations/stanton/yela",
    });
  });

  it("returns an empty array without a query", async () => {
    const response = await GET(request(null));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });

  it("rejects overlong queries with 400", async () => {
    const response = await GET(request("x".repeat(101)));
    expect(response.status).toBe(400);
  });
});
