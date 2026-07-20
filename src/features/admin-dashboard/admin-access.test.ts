import { describe, expect, it } from "vitest";
import { isAdminDiscordId, parseAdminDiscordIds } from "./admin-access";

describe("parseAdminDiscordIds", () => {
  it("parses a comma-separated list, trimming whitespace", () => {
    const ids = parseAdminDiscordIds({ ADMIN_DISCORD_IDS: "123, 456 ,789" });
    expect([...ids].sort()).toEqual(["123", "456", "789"]);
  });

  it("drops empty entries from stray commas", () => {
    const ids = parseAdminDiscordIds({ ADMIN_DISCORD_IDS: "123,,, ,456," });
    expect([...ids].sort()).toEqual(["123", "456"]);
  });

  it("returns an empty set when unset or blank", () => {
    expect(parseAdminDiscordIds({}).size).toBe(0);
    expect(parseAdminDiscordIds({ ADMIN_DISCORD_IDS: "   " }).size).toBe(0);
  });
});

describe("isAdminDiscordId", () => {
  const ids = new Set(["123", "456"]);

  it("is true for a listed id", () => {
    expect(isAdminDiscordId("123", ids)).toBe(true);
  });

  it("is false for an unlisted id", () => {
    expect(isAdminDiscordId("999", ids)).toBe(false);
  });

  it("is fail-closed for null/empty id or empty allowlist", () => {
    expect(isAdminDiscordId(null, ids)).toBe(false);
    expect(isAdminDiscordId("", ids)).toBe(false);
    expect(isAdminDiscordId("123", new Set())).toBe(false);
  });
});
