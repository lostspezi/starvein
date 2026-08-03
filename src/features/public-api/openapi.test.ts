import { describe, expect, it } from "vitest";
import { buildOpenApiDocument } from "./openapi";

const EXPECTED_PATHS = [
  "/ores",
  "/ores/{code}",
  "/ore-occurrences",
  "/signatures",
  "/star-systems",
  "/star-systems/{code}",
  "/star-systems/{code}/bodies",
  "/refinery-methods",
  "/refinery-terminals",
  "/refinery-yields",
  "/prices/{oreCode}",
  "/prices/ticker",
  "/openapi.json",
] as const;

describe("buildOpenApiDocument", () => {
  const doc = buildOpenApiDocument();

  it("is an OpenAPI 3.1 document with all v1 paths", () => {
    expect(doc.openapi).toMatch(/^3\.1\./);
    expect(doc.info.title).toContain("STARVEIN");
    for (const path of EXPECTED_PATHS) {
      expect(doc.paths, `missing path ${path}`).toHaveProperty([path]);
    }
    // Kein Pfad, der nicht dokumentiert ist
    expect(Object.keys(doc.paths ?? {})).toHaveLength(EXPECTED_PATHS.length);
  });

  it("declares bearer and x-api-key security schemes", () => {
    expect(doc.components?.securitySchemes).toMatchObject({
      bearerAuth: { type: "http", scheme: "bearer" },
      apiKeyHeader: { type: "apiKey", in: "header", name: "x-api-key" },
    });
  });

  it("requires a key on every operation except the spec itself", () => {
    for (const [path, item] of Object.entries(doc.paths ?? {})) {
      const operation = (item as { get?: { security?: unknown[] } }).get;
      expect(operation, `missing GET for ${path}`).toBeDefined();
      if (path === "/openapi.json") {
        expect(operation?.security).toEqual([]);
      } else {
        expect(operation?.security, `missing security for ${path}`).toEqual([
          { bearerAuth: [] },
          { apiKeyHeader: [] },
        ]);
      }
    }
  });

  it("documents 401 and 429 responses on secured operations", () => {
    const ores = doc.paths?.["/ores"]?.get;
    expect(ores?.responses).toHaveProperty(["401"]);
    expect(ores?.responses).toHaveProperty(["429"]);
  });

  it("uses a relative server so try-it works on any host", () => {
    expect(doc.servers?.[0]?.url).toBe("/api/v1");
  });
});
