import { render, screen } from "@testing-library/react";
import { IntlProvider } from "use-intl";
import { describe, expect, it, vi } from "vitest";
import type { RefineryJob } from "@starvein/shared/refinery-jobs";
import { messages } from "../../i18n/messages";
import { JobList } from "./JobList";

const NOW = Date.parse("2026-07-14T12:00:00.000Z");

function makeJob(overrides: Partial<RefineryJob> = {}): RefineryJob {
  return {
    id: "job-1",
    ownerUserId: "user-1",
    terminalId: 32,
    terminalName: "ARC-L1 Wide Forest Station",
    starSystemName: "Stanton",
    methodCode: "DINYX",
    items: [{ oreCode: "QUAN", quantityScu: 32 }],
    durationMinutes: 120,
    startedAt: "2026-07-14T11:00:00.000Z", // fertig um 13:00 → läuft noch
    status: "processing",
    collectedAt: null,
    patchVersion: "4.8.0",
    createdAt: "2026-07-14T11:00:00.000Z",
    updatedAt: "2026-07-14T11:00:00.000Z",
    ...overrides,
  };
}

function renderList(jobs: RefineryJob[]) {
  return render(
    <IntlProvider locale="en" messages={messages.en}>
      <JobList jobs={jobs} nowMs={NOW} onRefresh={vi.fn()} />
    </IntlProvider>,
  );
}

describe("JobList", () => {
  it("shows the remaining time for processing jobs", () => {
    renderList([makeJob()]);
    expect(screen.getByText("ARC-L1 Wide Forest Station")).toBeVisible();
    expect(screen.getByText("1h 00m")).toBeVisible();
    expect(screen.getByText("QUAN · 32 SCU")).toBeVisible();
  });

  it("marks jobs as ready once the duration elapsed", () => {
    renderList([
      makeJob({ startedAt: "2026-07-14T09:00:00.000Z" }), // fertig um 11:00
    ]);
    expect(screen.getByText("Ready to collect")).toBeVisible();
  });

  it("shows an empty state without jobs", () => {
    renderList([]);
    expect(screen.getByText("No refinery jobs tracked yet.")).toBeVisible();
  });
});
