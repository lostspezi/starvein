import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render";
import { SeoPanel } from "./SeoPanel";
import type { SeoAnalytics } from "./cloudflare-analytics.schema";

vi.mock("./PageViewsChart", () => ({
  PageViewsChart: () => <div data-testid="page-views-chart" />,
}));

function base(overrides: Partial<SeoAnalytics> = {}): SeoAnalytics {
  return {
    configured: true,
    unavailable: false,
    totalPageViews: 0,
    countries: [],
    referrers: [],
    topPages: [],
    pageViews: [],
    ...overrides,
  };
}

describe("SeoPanel", () => {
  it("shows a not-configured notice when Cloudflare env is missing", () => {
    renderWithIntl(<SeoPanel analytics={base({ configured: false })} />);
    expect(
      screen.getByText("Cloudflare analytics are not configured."),
    ).toBeInTheDocument();
  });

  it("shows an unavailable notice when the fetch failed", () => {
    renderWithIntl(<SeoPanel analytics={base({ unavailable: true })} />);
    expect(
      screen.getByText("Cloudflare analytics are currently unavailable."),
    ).toBeInTheDocument();
  });

  it("renders countries, referrers and top pages when data is present", () => {
    renderWithIntl(
      <SeoPanel
        analytics={base({
          totalPageViews: 150,
          countries: [{ country: "Germany", views: 120 }],
          referrers: [{ referrer: "google.com", views: 30 }],
          topPages: [{ path: "/en/ores", views: 90 }],
          pageViews: [{ date: "2026-07-20", views: 150 }],
        })}
      />,
    );

    expect(screen.getByText("Germany")).toBeInTheDocument();
    expect(screen.getByText("google.com")).toBeInTheDocument();
    expect(screen.getByText("/en/ores")).toBeInTheDocument();
    expect(screen.getByTestId("page-views-chart")).toBeInTheDocument();
  });
});
