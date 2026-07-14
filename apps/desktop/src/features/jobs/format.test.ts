import { describe, expect, it } from "vitest";
import { formatRemaining } from "./format";

describe("formatRemaining", () => {
  it("formats minutes below an hour", () => {
    expect(formatRemaining(45)).toBe("45m");
  });

  it("formats hours with padded minutes", () => {
    expect(formatRemaining(125)).toBe("2h 05m");
  });

  it("clamps zero", () => {
    expect(formatRemaining(0)).toBe("0m");
  });
});
