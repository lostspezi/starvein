import { describe, expect, it } from "vitest";
import { parseLocalizedNumber } from "./parse-number";

describe("parseLocalizedNumber", () => {
  it("parses plain integers", () => {
    expect(parseLocalizedNumber("32")).toBe(32);
  });

  it("parses German decimal comma", () => {
    expect(parseLocalizedNumber("1.234,56")).toBeCloseTo(1234.56);
  });

  it("parses English thousands with decimal point", () => {
    expect(parseLocalizedNumber("1,234.56")).toBeCloseTo(1234.56);
  });

  it("treats a single separator with three trailing digits as thousands", () => {
    expect(parseLocalizedNumber("1,234")).toBe(1234);
    expect(parseLocalizedNumber("1.234")).toBe(1234);
  });

  it("treats a single separator with fewer digits as decimal", () => {
    expect(parseLocalizedNumber("12,5")).toBeCloseTo(12.5);
    expect(parseLocalizedNumber("12.5")).toBeCloseTo(12.5);
  });

  it("ignores spaces from OCR noise", () => {
    expect(parseLocalizedNumber("1 234")).toBe(1234);
  });

  it("returns null for garbage", () => {
    expect(parseLocalizedNumber("abc")).toBeNull();
  });
});
