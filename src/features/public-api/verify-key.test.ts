import { describe, expect, it } from "vitest";
import { extractApiKey } from "./verify-key";

describe("extractApiKey", () => {
  it("reads the Authorization Bearer header", () => {
    expect(
      extractApiKey(new Headers({ authorization: "Bearer sv_abc123" })),
    ).toBe("sv_abc123");
  });

  it("falls back to x-api-key", () => {
    expect(extractApiKey(new Headers({ "x-api-key": "sv_abc123" }))).toBe(
      "sv_abc123",
    );
  });

  it("prefers Authorization over x-api-key", () => {
    expect(
      extractApiKey(
        new Headers({
          authorization: "Bearer sv_first",
          "x-api-key": "sv_second",
        }),
      ),
    ).toBe("sv_first");
  });

  it("returns null without credentials or for empty values", () => {
    expect(extractApiKey(new Headers())).toBeNull();
    expect(
      extractApiKey(new Headers({ authorization: "Bearer   " })),
    ).toBeNull();
    expect(
      extractApiKey(new Headers({ authorization: "Basic xyz" })),
    ).toBeNull();
  });
});
