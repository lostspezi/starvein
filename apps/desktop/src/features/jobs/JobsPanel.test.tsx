import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "use-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RefineryJob } from "@starvein/shared/refinery-jobs";
import { messages } from "../../i18n/messages";
import { collectRefineryJob, fetchOwnJobs } from "../../lib/api";
import { JobsPanel } from "./JobsPanel";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return {
    ...actual,
    fetchOwnJobs: vi.fn(),
    collectRefineryJob: vi.fn(),
  };
});
vi.mock("../../lib/notify", () => ({ notify: vi.fn() }));

const mockedFetchOwnJobs = vi.mocked(fetchOwnJobs);
const mockedCollect = vi.mocked(collectRefineryJob);

function makeReadyJob(): RefineryJob {
  const startedAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  return {
    id: "job-1",
    ownerUserId: "user-1",
    terminalId: 32,
    terminalName: "ARC-L1 Wide Forest Station",
    starSystemName: "Stanton",
    methodCode: "DINYX",
    items: [{ oreCode: "QUAN", quantityScu: 32 }],
    durationMinutes: 120,
    startedAt,
    status: "processing",
    collectedAt: null,
    patchVersion: "4.8.0",
    createdAt: startedAt,
    updatedAt: startedAt,
  };
}

describe("JobsPanel", () => {
  beforeEach(() => {
    mockedFetchOwnJobs.mockReset();
    mockedCollect.mockReset();
  });

  it("holt einen fertigen Job ab und zeigt ihn als abgeholt", async () => {
    const job = makeReadyJob();
    mockedFetchOwnJobs.mockResolvedValue([job]);
    mockedCollect.mockResolvedValue({
      ...job,
      status: "collected",
      collectedAt: new Date().toISOString(),
    });

    render(
      <IntlProvider locale="en" messages={messages.en}>
        <JobsPanel token="tok" onUnauthorized={vi.fn()} />
      </IntlProvider>,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "Collect" }),
    );

    expect(await screen.findByText("Collected")).toBeVisible();
    expect(mockedCollect).toHaveBeenCalledWith("tok", "job-1");
  });
});
