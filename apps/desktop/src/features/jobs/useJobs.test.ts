import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RefineryJob } from "@starvein/shared/refinery-jobs";
import { ApiError, collectRefineryJob, fetchOwnJobs } from "../../lib/api";
import { useJobs } from "./useJobs";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return {
    ...actual,
    fetchOwnJobs: vi.fn(),
    collectRefineryJob: vi.fn(),
  };
});

const mockedFetchOwnJobs = vi.mocked(fetchOwnJobs);
const mockedCollect = vi.mocked(collectRefineryJob);

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
    startedAt: "2026-07-14T09:00:00.000Z",
    status: "processing",
    collectedAt: null,
    patchVersion: "4.8.0",
    createdAt: "2026-07-14T09:00:00.000Z",
    updatedAt: "2026-07-14T09:00:00.000Z",
    ...overrides,
  };
}

async function renderJobs(onUnauthorized = vi.fn()) {
  const hook = renderHook(() => useJobs("tok", onUnauthorized));
  await waitFor(() => expect(hook.result.current.jobs).not.toBeNull());
  return hook;
}

describe("useJobs collect", () => {
  beforeEach(() => {
    mockedFetchOwnJobs.mockReset();
    mockedCollect.mockReset();
    mockedFetchOwnJobs.mockResolvedValue([makeJob()]);
  });

  it("ersetzt den Job im State durch die Server-Antwort", async () => {
    const collectedJob = makeJob({
      status: "collected",
      collectedAt: "2026-07-14T12:00:00.000Z",
    });
    mockedCollect.mockResolvedValue(collectedJob);
    const { result } = await renderJobs();

    await act(() => result.current.collect("job-1"));

    expect(mockedCollect).toHaveBeenCalledWith("tok", "job-1");
    expect(result.current.jobs).toEqual([collectedJob]);
  });

  it("meldet die collectingId während des Pendings", async () => {
    let resolveCollect!: (job: RefineryJob) => void;
    mockedCollect.mockReturnValue(
      new Promise((resolve) => {
        resolveCollect = resolve;
      }),
    );
    const { result } = await renderJobs();

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.collect("job-1");
    });
    expect(result.current.collectingId).toBe("job-1");

    resolveCollect(makeJob({ status: "collected" }));
    await act(() => pending);
    expect(result.current.collectingId).toBeNull();
  });

  it("ruft onUnauthorized bei 401", async () => {
    mockedCollect.mockRejectedValue(new ApiError(401));
    const onUnauthorized = vi.fn();
    const { result } = await renderJobs(onUnauthorized);

    await act(() => result.current.collect("job-1"));

    expect(onUnauthorized).toHaveBeenCalled();
    expect(result.current.collectError).toBeNull();
  });

  it("setzt collectError auf rateLimited bei 429", async () => {
    mockedCollect.mockRejectedValue(new ApiError(429));
    const { result } = await renderJobs();

    await act(() => result.current.collect("job-1"));

    expect(result.current.collectError).toBe("rateLimited");
  });

  it("setzt collectError auf protocol bei Netzwerkfehlern", async () => {
    mockedCollect.mockRejectedValue(new Error("network down"));
    const { result } = await renderJobs();

    await act(() => result.current.collect("job-1"));

    expect(result.current.collectError).toBe("protocol");
  });

  it("resynct still bei 400 (z. B. bereits via Web abgeholt)", async () => {
    mockedCollect.mockRejectedValue(new ApiError(400));
    const { result } = await renderJobs();
    const fetchCallsBefore = mockedFetchOwnJobs.mock.calls.length;

    await act(() => result.current.collect("job-1"));

    expect(result.current.collectError).toBeNull();
    await waitFor(() =>
      expect(mockedFetchOwnJobs.mock.calls.length).toBeGreaterThan(
        fetchCallsBefore,
      ),
    );
  });

  it("löscht einen vorherigen collectError bei erfolgreichem Abholen", async () => {
    mockedCollect.mockRejectedValueOnce(new ApiError(429));
    mockedCollect.mockResolvedValueOnce(makeJob({ status: "collected" }));
    const { result } = await renderJobs();

    await act(() => result.current.collect("job-1"));
    expect(result.current.collectError).toBe("rateLimited");

    await act(() => result.current.collect("job-1"));
    expect(result.current.collectError).toBeNull();
  });
});
