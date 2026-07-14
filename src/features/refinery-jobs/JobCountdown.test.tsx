import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { JobCountdown } from "./JobCountdown";

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-07-14T10:30:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("JobCountdown", () => {
  it("shows the remaining time once mounted", () => {
    renderWithIntl(
      <JobCountdown
        startedAt="2026-07-14T10:00:00.000Z"
        durationMinutes={90}
      />,
      { locale: "en" },
    );

    // 60 Minuten verbleibend → "1h 0m remaining"
    expect(screen.getByText("1h 0m remaining")).toBeVisible();
    expect(screen.getByText("Processing")).toBeVisible();
  });

  it("shows the ready label when the job is done", () => {
    renderWithIntl(
      <JobCountdown
        startedAt="2026-07-14T08:00:00.000Z"
        durationMinutes={90}
      />,
      { locale: "en" },
    );

    expect(screen.getByText("Ready")).toBeVisible();
  });

  it("always shows the absolute ready time", () => {
    renderWithIntl(
      <JobCountdown
        startedAt="2026-07-14T10:00:00.000Z"
        durationMinutes={90}
      />,
      { locale: "en" },
    );

    expect(screen.getByText(/Ready:/)).toBeVisible();
  });
});
