import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const safeFetch = vi.hoisted(() => vi.fn());
vi.mock("./safe-fetch", () => ({ safeFetch }));

import { coreIndexNowUrls, submitUrls } from "./indexnow";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  safeFetch.mockReset();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("submitUrls", () => {
  it("skips (no request) when INDEXNOW_KEY is unset", async () => {
    vi.stubEnv("INDEXNOW_KEY", "");
    expect(await submitUrls(["https://starvein.app/en/ores"])).toBe(false);
    expect(safeFetch).not.toHaveBeenCalled();
  });

  it("skips when the url list is empty", async () => {
    vi.stubEnv("INDEXNOW_KEY", "abc123");
    expect(await submitUrls([])).toBe(false);
    expect(safeFetch).not.toHaveBeenCalled();
  });

  it("posts host, key, keyLocation and urlList to the IndexNow endpoint", async () => {
    vi.stubEnv("INDEXNOW_KEY", "abc123");
    safeFetch.mockResolvedValue({ ok: true, status: 200 });

    expect(await submitUrls(["https://starvein.app/en/ores"])).toBe(true);
    expect(safeFetch).toHaveBeenCalledTimes(1);

    const [url, init] = safeFetch.mock.calls[0];
    expect(url).toBe("https://api.indexnow.org/indexnow");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      host: "starvein.app",
      key: "abc123",
      keyLocation: "https://starvein.app/indexnow-key.txt",
      urlList: ["https://starvein.app/en/ores"],
    });
  });

  it("returns false on a non-ok response", async () => {
    vi.stubEnv("INDEXNOW_KEY", "abc123");
    safeFetch.mockResolvedValue({ ok: false, status: 403 });
    expect(await submitUrls(["https://starvein.app/en/ores"])).toBe(false);
  });

  it("swallows request errors and returns false (never blocks the sync)", async () => {
    vi.stubEnv("INDEXNOW_KEY", "abc123");
    safeFetch.mockRejectedValue(new Error("network"));
    expect(await submitUrls(["https://starvein.app/en/ores"])).toBe(false);
  });
});

describe("coreIndexNowUrls", () => {
  it("lists the core hub pages for every locale", () => {
    const urls = coreIndexNowUrls();
    expect(urls).toContain("https://starvein.app/de/ores");
    expect(urls).toContain("https://starvein.app/en/signatures");
    // 2 locales × 6 core paths
    expect(urls).toHaveLength(12);
  });
});
