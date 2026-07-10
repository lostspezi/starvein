import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins multiple class strings", () => {
    expect(cn("rounded", "border")).toBe("rounded border");
  });

  it("ignores falsy values", () => {
    expect(cn("rounded", false, undefined, null, "")).toBe("rounded");
  });

  it("supports conditional object syntax", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });

  it("deduplicates conflicting tailwind utilities, last one wins", () => {
    expect(cn("px-4", "px-2")).toBe("px-2");
    expect(cn("bg-bg-nebula", "bg-glass")).toBe("bg-glass");
  });

  it("keeps non-conflicting utilities intact", () => {
    expect(cn("rounded-lg border border-bg-nebula-2", "p-4")).toBe(
      "rounded-lg border border-bg-nebula-2 p-4",
    );
  });
});
