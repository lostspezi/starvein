import { describe, expect, it, vi } from "vitest";
import { CACHE_TAGS, cacheKey, cachedQuery } from "./data-cache";

describe("cacheKey", () => {
  it("composes the tag with stringified key parts", () => {
    expect(cacheKey(CACHE_TAGS.wiki, ["ores", 5, null, undefined])).toEqual([
      "wiki-data",
      "ores",
      "5",
      "",
      "",
    ]);
  });
});

describe("cachedQuery", () => {
  it("falls back to a direct call outside the Next runtime", async () => {
    // In Vitest gibt es keinen incrementalCache — cachedQuery muss die
    // Query trotzdem genau einmal ausführen und das Ergebnis liefern.
    const fn = vi.fn(async () => ({ value: 42 }));

    await expect(cachedQuery(CACHE_TAGS.wiki, ["test"], fn)).resolves.toEqual({
      value: 42,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("propagates real query errors instead of swallowing them", async () => {
    const fn = vi.fn(async () => {
      throw new Error("mongo down");
    });

    await expect(cachedQuery(CACHE_TAGS.uex, ["test"], fn)).rejects.toThrow(
      "mongo down",
    );
  });
});
