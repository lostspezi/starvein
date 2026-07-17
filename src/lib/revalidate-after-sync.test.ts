import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath, revalidateTag } from "next/cache";
import { revalidateAfterSync } from "./revalidate-after-sync";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

describe("revalidateAfterSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revalidates the wiki tag and all wiki-fed ISR routes after a wiki sync", () => {
    revalidateAfterSync("wiki");
    expect(revalidateTag).toHaveBeenCalledWith("wiki-data", "max");
    for (const path of [
      "/[locale]/ores/[code]",
      "/[locale]/locations/[system]",
      "/[locale]/locations/[system]/[body]",
      "/[locale]/materials/[code]",
      "/[locale]/blueprints/[slug]",
    ]) {
      expect(revalidatePath).toHaveBeenCalledWith(path, "page");
    }
  });

  it("revalidates the uex tag and the price-bearing ore pages after a uex sync", () => {
    revalidateAfterSync("uex");
    expect(revalidateTag).toHaveBeenCalledWith("uex-data", "max");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/[locale]/ores/[code]",
      "page",
    );
    expect(revalidatePath).not.toHaveBeenCalledWith(
      "/[locale]/locations/[system]/[body]",
      "page",
    );
  });

  it("never fails the sync when the cache runtime is unavailable", () => {
    vi.mocked(revalidateTag).mockImplementationOnce(() => {
      throw new Error("Invariant: static generation store missing");
    });
    expect(() => revalidateAfterSync("wiki")).not.toThrow();
  });
});
