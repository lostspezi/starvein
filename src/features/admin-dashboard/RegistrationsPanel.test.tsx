import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render";
import { RegistrationsPanel } from "./RegistrationsPanel";
import type { RegistrationStats } from "./registrations.schema";

// recharts braucht ResizeObserver (in jsdom nicht vorhanden) — der Chart wird
// separat gehalten und hier gestubbt, damit der Panel-Test die Datenanzeige prüft.
vi.mock("./SignupTrendChart", () => ({
  SignupTrendChart: () => <div data-testid="signup-trend-chart" />,
}));

const stats: RegistrationStats = {
  totalUsers: 42,
  newLast24h: 3,
  newLast7d: 9,
  newLast30d: 21,
  activeSessions: 5,
  byProvider: [
    { provider: "discord", count: 40 },
    { provider: "google", count: 2 },
  ],
  dailySignups: [{ date: "2026-07-20", count: 3 }],
  recentSignups: [
    {
      name: "Aria",
      provider: "discord",
      createdAt: "2026-07-20T10:00:00.000Z",
    },
  ],
};

describe("RegistrationsPanel", () => {
  it("renders totals, provider breakdown, chart and recent signups", () => {
    renderWithIntl(<RegistrationsPanel stats={stats} />);

    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Total users")).toBeInTheDocument();
    expect(screen.getByText("Aria")).toBeInTheDocument();
    expect(screen.getAllByText(/discord/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId("signup-trend-chart")).toBeInTheDocument();
  });

  it("shows an empty state when there are no recent signups", () => {
    renderWithIntl(
      <RegistrationsPanel stats={{ ...stats, recentSignups: [] }} />,
    );
    expect(screen.getByText("No signups yet.")).toBeInTheDocument();
  });
});
