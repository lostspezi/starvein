import { describe, expect, it } from "vitest";
import { formatQuantityValue, quantityUnitKey } from "./format-quantity";

describe("formatQuantityValue", () => {
  it("keeps fractional SCU amounts", () => {
    expect(formatQuantityValue(0.36, "resource", "en")).toBe("0.36");
  });

  it("drops trailing zeros on whole SCU amounts", () => {
    expect(formatQuantityValue(2, "resource", "en")).toBe("2");
  });

  it("rounds SCU to two decimals", () => {
    expect(formatQuantityValue(1.005, "resource", "en")).toBe("1.01");
  });

  it("renders item counts as integers", () => {
    expect(formatQuantityValue(7, "item", "en")).toBe("7");
  });

  it("never shows a fraction for item counts", () => {
    expect(formatQuantityValue(7.6, "item", "en")).toBe("8");
  });

  it("uses locale-specific decimal separators", () => {
    expect(formatQuantityValue(0.36, "resource", "de")).toBe("0,36");
  });

  it("groups large item counts by locale", () => {
    expect(formatQuantityValue(1234, "item", "en")).toBe("1,234");
  });
});

describe("quantityUnitKey", () => {
  it("maps resource to the SCU unit", () => {
    expect(quantityUnitKey("resource")).toBe("scu");
  });

  it("maps item to the count unit", () => {
    expect(quantityUnitKey("item")).toBe("count");
  });
});
