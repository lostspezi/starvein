import { describe, expect, it } from "vitest";
import { v1Preflight, withCors } from "./cors";

describe("v1Preflight", () => {
  it("answers OPTIONS with 204 and CORS headers", () => {
    const response = v1Preflight();
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toContain(
      "GET",
    );
    expect(response.headers.get("access-control-allow-headers")).toContain(
      "Authorization",
    );
  });
});

describe("withCors", () => {
  it("adds CORS headers without touching status or body", async () => {
    const response = withCors(
      new Response(JSON.stringify({ error: "invalid api key" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.json()).toEqual({ error: "invalid api key" });
  });
});
