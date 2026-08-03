import { afterAll, describe, expect, it } from "vitest";
import { GET } from "@/app/api/v1/openapi.json/route";
import { closeMongo } from "@/lib/db";

describe("GET /api/v1/openapi.json", () => {
  afterAll(async () => {
    await closeMongo();
  });

  it("serves the spec without an API key, with CORS", async () => {
    const response = await GET(
      new Request("http://localhost/api/v1/openapi.json"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");

    const doc = await response.json();
    expect(doc.openapi).toMatch(/^3\.1\./);
    expect(doc.paths["/ores"]).toBeDefined();
  });
});
