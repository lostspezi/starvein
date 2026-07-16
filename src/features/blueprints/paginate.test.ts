import { describe, expect, it } from "vitest";
import { paginate, parsePageParam } from "./paginate";

const items = Array.from({ length: 120 }, (_, i) => i + 1);

describe("paginate", () => {
  it("returns the first page by default size", () => {
    const result = paginate(items, 1, 50);

    expect(result.items).toHaveLength(50);
    expect(result.items[0]).toBe(1);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(3);
    expect(result.total).toBe(120);
  });

  it("returns a middle page", () => {
    expect(paginate(items, 2, 50).items[0]).toBe(51);
  });

  it("returns a short last page", () => {
    const result = paginate(items, 3, 50);

    expect(result.items).toHaveLength(20);
    expect(result.items[0]).toBe(101);
  });

  it("clamps a page beyond the end to the last page", () => {
    expect(paginate(items, 99, 50).page).toBe(3);
  });

  it("clamps a page below one", () => {
    expect(paginate(items, 0, 50).page).toBe(1);
    expect(paginate(items, -5, 50).page).toBe(1);
  });

  it("handles an empty list without dividing by zero", () => {
    const result = paginate([], 1, 50);

    expect(result.items).toEqual([]);
    expect(result.totalPages).toBe(1);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
  });

  it("handles a list shorter than one page", () => {
    const result = paginate([1, 2, 3], 1, 50);

    expect(result.items).toHaveLength(3);
    expect(result.totalPages).toBe(1);
  });

  it("floors a fractional page", () => {
    expect(paginate(items, 2.7, 50).page).toBe(2);
  });
});

describe("parsePageParam", () => {
  it("parses a numeric page", () => {
    expect(parsePageParam("3")).toBe(3);
  });

  it("falls back to 1 for missing, invalid or out-of-range values", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam("nope")).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-2")).toBe(1);
    expect(parsePageParam(["2", "3"])).toBe(1);
  });
});
