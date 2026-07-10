import { describe, expect, it } from "vitest";
import { canModerateChat, canTimeoutTarget, toRole } from "./roles";

describe("toRole", () => {
  it("passes through known roles", () => {
    expect(toRole("user")).toBe("user");
    expect(toRole("moderator")).toBe("moderator");
    expect(toRole("admin")).toBe("admin");
  });

  it("falls back to user for unknown values", () => {
    expect(toRole(undefined)).toBe("user");
    expect(toRole(null)).toBe("user");
    expect(toRole("superuser")).toBe("user");
    expect(toRole(42)).toBe("user");
  });
});

describe("canModerateChat", () => {
  it("allows moderator and admin only", () => {
    expect(canModerateChat("moderator")).toBe(true);
    expect(canModerateChat("admin")).toBe(true);
    expect(canModerateChat("user")).toBe(false);
  });
});

describe("canTimeoutTarget", () => {
  it("lets moderators and admins timeout plain users", () => {
    expect(canTimeoutTarget("moderator", "user")).toBe(true);
    expect(canTimeoutTarget("admin", "user")).toBe(true);
  });

  it("rejects moderator and admin targets", () => {
    expect(canTimeoutTarget("moderator", "moderator")).toBe(false);
    expect(canTimeoutTarget("moderator", "admin")).toBe(false);
    expect(canTimeoutTarget("admin", "moderator")).toBe(false);
    expect(canTimeoutTarget("admin", "admin")).toBe(false);
  });

  it("rejects requesters without moderation rights", () => {
    expect(canTimeoutTarget("user", "user")).toBe(false);
  });
});
