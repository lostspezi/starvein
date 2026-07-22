import { describe, expect, it } from "vitest";
import { matchesDepositFilter } from "./deposit-filter";

describe("matchesDepositFilter", () => {
  it("matches everything without an active filter", () => {
    expect(matchesDepositFilter("primary", null)).toBe(true);
    expect(matchesDepositFilter("secondary", null)).toBe(true);
    expect(matchesDepositFilter(undefined, null)).toBe(true);
  });

  it("keeps rows without deposit data when filtering for primary", () => {
    expect(matchesDepositFilter("primary", "primary")).toBe(true);
    expect(matchesDepositFilter(undefined, "primary")).toBe(true);
    expect(matchesDepositFilter("secondary", "primary")).toBe(false);
  });

  it("only matches explicit secondary rows when filtering for secondary", () => {
    expect(matchesDepositFilter("secondary", "secondary")).toBe(true);
    expect(matchesDepositFilter("primary", "secondary")).toBe(false);
    expect(matchesDepositFilter(undefined, "secondary")).toBe(false);
  });
});
