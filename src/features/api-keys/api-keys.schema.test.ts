import { describe, expect, it } from "vitest";
import { MAX_API_KEYS_PER_USER } from "@/lib/api-key-plugin";
import { createKeySchema } from "./api-keys.schema";

describe("createKeySchema", () => {
  it("accepts a simple name and trims whitespace", () => {
    const parsed = createKeySchema.parse({ name: "  Mein Discord-Bot  " });
    expect(parsed.name).toBe("Mein Discord-Bot");
  });

  it("rejects an empty name", () => {
    expect(createKeySchema.safeParse({ name: "" }).success).toBe(false);
    expect(createKeySchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("rejects names longer than 50 characters", () => {
    expect(createKeySchema.safeParse({ name: "x".repeat(51) }).success).toBe(
      false,
    );
    expect(createKeySchema.safeParse({ name: "x".repeat(50) }).success).toBe(
      true,
    );
  });

  it("rejects a missing name", () => {
    expect(createKeySchema.safeParse({}).success).toBe(false);
  });
});

describe("key limit", () => {
  it("allows five keys per user", () => {
    expect(MAX_API_KEYS_PER_USER).toBe(5);
  });
});
