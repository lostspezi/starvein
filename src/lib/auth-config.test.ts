import { describe, expect, it } from "vitest";
import { resolveTrustedOrigins } from "@/lib/auth-config";

describe("resolveTrustedOrigins", () => {
  it("includes the BETTER_AUTH_URL origin", () => {
    expect(
      resolveTrustedOrigins({ BETTER_AUTH_URL: "https://starvein.app/api" }),
    ).toEqual(["https://starvein.app"]);
  });

  it("merges comma-separated extra origins, normalized and deduped", () => {
    const result = resolveTrustedOrigins({
      BETTER_AUTH_URL: "https://starvein.app",
      BETTER_AUTH_TRUSTED_ORIGINS:
        "https://www.starvein.app/, https://starvein.app , http://localhost:3000",
    });
    expect(result).toEqual([
      "https://starvein.app",
      "https://www.starvein.app",
      "http://localhost:3000",
    ]);
  });

  it("passes wildcard patterns through unchanged", () => {
    const result = resolveTrustedOrigins({
      BETTER_AUTH_URL: "https://starvein.app",
      BETTER_AUTH_TRUSTED_ORIGINS: "https://*.starvein.app",
    });
    expect(result).toContain("https://*.starvein.app");
  });

  it("ignores blanks and invalid entries without throwing", () => {
    expect(
      resolveTrustedOrigins({
        BETTER_AUTH_URL: undefined,
        BETTER_AUTH_TRUSTED_ORIGINS: " , not a url , ",
      }),
    ).toEqual([]);
  });
});
