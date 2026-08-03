import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { KeyStatsPanel } from "./KeyStatsPanel";

const stats = {
  series: [
    { day: "2026-08-02", total: 10, errors: 2, throttled: 1 },
    { day: "2026-08-03", total: 5, errors: 0, throttled: 0 },
  ],
  topEndpoints: [
    { endpoint: "ores", count: 9 },
    { endpoint: "signatures", count: 6 },
  ],
  totals: { total: 15, errorRatePercent: 13.3, count429: 1 },
};

describe("KeyStatsPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and renders totals and top endpoints", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(stats), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    renderWithIntl(<KeyStatsPanel keyId="abc" />);

    expect(await screen.findByText("15")).toBeInTheDocument();
    expect(screen.getByText("13.3%")).toBeInTheDocument();
    expect(screen.getByText("ores")).toBeInTheDocument();
    expect(screen.getByText("signatures")).toBeInTheDocument();
  });

  it("shows an error message when loading fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 500 }),
    );

    renderWithIntl(<KeyStatsPanel keyId="abc" />);
    expect(
      await screen.findByText(/could not load statistics/i),
    ).toBeInTheDocument();
  });
});
