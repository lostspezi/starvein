import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RefineryJob } from "@starvein/shared/refinery-jobs";
import { ApiError, collectRefineryJob } from "./api";
import { fetch } from "./http";

vi.mock("./http", () => ({ fetch: vi.fn() }));
vi.mock("./config", () => ({ getServerUrl: () => "https://server.test" }));

const mockedFetch = vi.mocked(fetch);

const job: RefineryJob = {
  id: "job-1",
  ownerUserId: "user-1",
  terminalId: 32,
  terminalName: "ARC-L1 Wide Forest Station",
  starSystemName: "Stanton",
  methodCode: "DINYX",
  items: [{ oreCode: "QUAN", quantityScu: 32 }],
  durationMinutes: 120,
  startedAt: "2026-07-14T09:00:00.000Z",
  status: "collected",
  collectedAt: "2026-07-14T12:00:00.000Z",
  patchVersion: "4.8.0",
  createdAt: "2026-07-14T09:00:00.000Z",
  updatedAt: "2026-07-14T12:00:00.000Z",
};

describe("collectRefineryJob", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("POSTet einen leeren Body mit Bearer-Token an den Collect-Endpunkt", async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ job, warehouseEntries: [] }),
    } as Response);

    await collectRefineryJob("tok", "job-1");

    expect(mockedFetch).toHaveBeenCalledWith(
      "https://server.test/api/refinery-jobs/job-1/collect",
      {
        method: "POST",
        headers: {
          authorization: "Bearer tok",
          "content-type": "application/json",
        },
        body: "{}",
      },
    );
  });

  it("gibt den geparsten Job aus der Antwort zurück", async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ job, warehouseEntries: [] }),
    } as Response);

    await expect(collectRefineryJob("tok", "job-1")).resolves.toEqual(job);
  });

  it("wirft ApiError mit dem HTTP-Status bei Fehlerantworten", async () => {
    mockedFetch.mockResolvedValue({ ok: false, status: 429 } as Response);

    const promise = collectRefineryJob("tok", "job-1");
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 429 });
  });
});
