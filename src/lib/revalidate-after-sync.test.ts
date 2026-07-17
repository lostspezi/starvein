import { describe, expect, it, vi } from "vitest";
import { revalidateTag } from "next/cache";
import { revalidateAfterSync } from "./revalidate-after-sync";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

describe("revalidateAfterSync", () => {
  it("revalidates the wiki tag after a wiki sync", () => {
    revalidateAfterSync("wiki");
    expect(revalidateTag).toHaveBeenCalledWith("wiki-data", "max");
  });

  it("revalidates the uex tag after a uex sync", () => {
    revalidateAfterSync("uex");
    expect(revalidateTag).toHaveBeenCalledWith("uex-data", "max");
  });

  it("never fails the sync when the cache runtime is unavailable", () => {
    vi.mocked(revalidateTag).mockImplementationOnce(() => {
      throw new Error("Invariant: static generation store missing");
    });
    expect(() => revalidateAfterSync("wiki")).not.toThrow();
  });
});
