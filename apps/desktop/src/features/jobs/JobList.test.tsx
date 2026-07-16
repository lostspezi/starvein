import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function renderList(
  jobs: RefineryJob[],
  props: Partial<Parameters<typeof JobList>[0]> = {},
) {
  return render(
    <IntlProvider locale="en" messages={messages.en}>
      <JobList
        jobs={jobs}
        nowMs={NOW}
        onRefresh={vi.fn()}
        onCollect={vi.fn()}
        {...props}
      />
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

  it("shows a collect button on ready jobs", () => {
    renderList([makeJob({ startedAt: "2026-07-14T09:00:00.000Z" })]);
    expect(screen.getByRole("button", { name: "Collect" })).toBeVisible();
  });

  it("hides the collect button on processing and collected jobs", () => {
    renderList([
      makeJob(),
      makeJob({
        id: "job-2",
        startedAt: "2026-07-14T09:00:00.000Z",
        status: "collected",
        collectedAt: "2026-07-14T11:30:00.000Z",
      }),
    ]);
    expect(screen.queryByRole("button", { name: "Collect" })).toBeNull();
  });

  it("calls onCollect with the job id", async () => {
    const onCollect = vi.fn();
    renderList([makeJob({ startedAt: "2026-07-14T09:00:00.000Z" })], {
      onCollect,
    });
    await userEvent.click(screen.getByRole("button", { name: "Collect" }));
    expect(onCollect).toHaveBeenCalledWith("job-1");
  });

  it("disables the button and shows a pending label while collecting", () => {
    renderList([makeJob({ startedAt: "2026-07-14T09:00:00.000Z" })], {
      collectingId: "job-1",
    });
    expect(screen.getByRole("button", { name: "Collecting …" })).toBeDisabled();
  });

  it("shows a collect error", () => {
    renderList([makeJob({ startedAt: "2026-07-14T09:00:00.000Z" })], {
      collectError: "rateLimited",
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Rate limit reached — please wait a moment and try again.",
    );
  });
});
