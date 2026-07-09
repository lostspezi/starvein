import { describe, expect, it } from "vitest";
import { wilsonLowerBound } from "./confidence-score";

describe("wilsonLowerBound", () => {
  it("returns 0 without votes", () => {
    expect(wilsonLowerBound(0, 0)).toBe(0);
  });

  it("stays within [0, 1]", () => {
    expect(wilsonLowerBound(1000, 0)).toBeLessThanOrEqual(1);
    expect(wilsonLowerBound(0, 1000)).toBeGreaterThanOrEqual(0);
  });

  it("ranks 40 up / 5 down above 2 up / 0 down (the Reddit example)", () => {
    expect(wilsonLowerBound(40, 5)).toBeGreaterThan(wilsonLowerBound(2, 0));
  });

  it("grows with more confirming votes at the same ratio", () => {
    expect(wilsonLowerBound(20, 5)).toBeGreaterThan(wilsonLowerBound(4, 1));
  });

  it("crosses the accept threshold with 5 clear upvotes", () => {
    // 5:0 ist der minimale Accept-Fall (Schwellwert 0.7 bei >= 5 Stimmen)
    expect(wilsonLowerBound(5, 0)).toBeGreaterThanOrEqual(0.5);
    expect(wilsonLowerBound(6, 0)).toBeGreaterThan(wilsonLowerBound(5, 0));
  });

  it("drops below the reject threshold with 1 up / 4 down", () => {
    expect(wilsonLowerBound(1, 4)).toBeLessThanOrEqual(0.2);
  });
});
