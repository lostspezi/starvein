import { afterEach, describe, expect, it, vi } from "vitest";

const safeFetch = vi.fn();
const readJsonCapped = vi.fn();
vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: (...args: unknown[]) => safeFetch(...args),
  readJsonCapped: (...args: unknown[]) => readJsonCapped(...args),
}));
vi.mock("@/lib/redis", () => ({ getRedis: () => ({ status: "ready" }) }));

import { getSeoAnalytics, mapRumResponse } from "./cloudflare-analytics.client";

const NOW = new Date("2026-07-20T12:00:00.000Z");

function rumResponse() {
  return {
    data: {
      viewer: {
        accounts: [
          {
            countries: [
              { count: 120, dimensions: { countryName: "Germany" } },
              { count: 40, dimensions: { countryName: "United States" } },
            ],
            referrers: [
              { count: 30, dimensions: { refererHost: "google.com" } },
            ],
            topPages: [
              { count: 90, dimensions: { requestPath: "/en/ores" } },
              { count: 10, dimensions: { requestPath: "" } }, // dropped (empty)
            ],
            daily: [
              { count: 5, dimensions: { date: "2026-07-20" } },
              { count: 7, dimensions: { date: "2026-07-18" } },
            ],
          },
        ],
      },
    },
  };
}

describe("mapRumResponse", () => {
  it("maps countries, referrers, top pages and a zero-filled daily series", () => {
    const result = mapRumResponse(rumResponse(), NOW);

    expect(result).toMatchObject({ configured: true, unavailable: false });
    expect(result.countries).toEqual([
      { country: "Germany", views: 120 },
      { country: "United States", views: 40 },
    ]);
    expect(result.referrers).toEqual([{ referrer: "google.com", views: 30 }]);
    expect(result.topPages).toEqual([{ path: "/en/ores", views: 90 }]);

    expect(result.pageViews).toHaveLength(30);
    const byDate = Object.fromEntries(
      result.pageViews.map((d) => [d.date, d.views]),
    );
    expect(byDate["2026-07-20"]).toBe(5);
    expect(byDate["2026-07-18"]).toBe(7);
    expect(byDate["2026-07-19"]).toBe(0);
    expect(result.totalPageViews).toBe(12);
  });

  it("treats GraphQL errors as unavailable", () => {
    const result = mapRumResponse({ errors: [{ message: "nope" }] }, NOW);
    expect(result).toMatchObject({ configured: true, unavailable: true });
  });

  it("treats a broken response shape as unavailable", () => {
    expect(mapRumResponse({}, NOW).unavailable).toBe(true);
    expect(
      mapRumResponse({ data: { viewer: { accounts: [] } } }, NOW).unavailable,
    ).toBe(true);
  });
});

describe("getSeoAnalytics", () => {
  afterEach(() => {
    safeFetch.mockReset();
    readJsonCapped.mockReset();
  });

  it("reports configured:false when Cloudflare env is missing (no fetch)", async () => {
    const result = await getSeoAnalytics({});
    expect(result).toMatchObject({ configured: false, unavailable: false });
    expect(safeFetch).not.toHaveBeenCalled();
  });

  it("fetches and maps when fully configured", async () => {
    safeFetch.mockResolvedValue({ ok: true });
    readJsonCapped.mockResolvedValue(rumResponse());

    const result = await getSeoAnalytics(
      {
        CLOUDFLARE_API_TOKEN: "token",
        CLOUDFLARE_ACCOUNT_ID: "acc",
        CLOUDFLARE_RUM_SITE_TAG: "site",
      },
      NOW,
    );

    expect(safeFetch).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ configured: true, unavailable: false });
    expect(result.countries[0]).toEqual({ country: "Germany", views: 120 });
  });

  it("degrades to unavailable when the request throws", async () => {
    safeFetch.mockRejectedValue(new Error("network"));

    const result = await getSeoAnalytics(
      {
        CLOUDFLARE_API_TOKEN: "token",
        CLOUDFLARE_ACCOUNT_ID: "acc",
        CLOUDFLARE_RUM_SITE_TAG: "site",
      },
      NOW,
    );

    expect(result).toMatchObject({ configured: true, unavailable: true });
  });
});
