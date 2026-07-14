import { afterEach, describe, expect, it } from "vitest";
import { getServerUrl, setServerUrl } from "./config";

afterEach(() => setServerUrl(null));

describe("server url config", () => {
  it("strips trailing slashes", () => {
    setServerUrl("http://localhost:3000/");
    expect(getServerUrl()).toBe("http://localhost:3000");
  });

  it("falls back to the default for empty values", () => {
    setServerUrl("http://localhost:3000");
    setServerUrl("   ");
    expect(getServerUrl()).not.toContain("localhost");
  });
});
