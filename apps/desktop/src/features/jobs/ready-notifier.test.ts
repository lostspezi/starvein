import { describe, expect, it } from "vitest";
import type { RefineryJob } from "@starvein/shared/refinery-jobs";
import { detectNewlyReady, seedNotifiedIds } from "./ready-notifier";

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
    durationMinutes: 60,
    startedAt: "2026-07-14T11:30:00.000Z", // fertig 12:30 → läuft noch
    status: "processing",
    collectedAt: null,
    patchVersion: "4.8.0",
    createdAt: "2026-07-14T11:30:00.000Z",
    updatedAt: "2026-07-14T11:30:00.000Z",
    ...overrides,
  };
}

const readyJob = (id: string) =>
  makeJob({ id, startedAt: "2026-07-14T10:00:00.000Z" }); // fertig 11:00

describe("seedNotifiedIds", () => {
  it("marks already-ready jobs as known so app start stays silent", () => {
    const seeded = seedNotifiedIds([readyJob("a"), makeJob({ id: "b" })], NOW);
    expect(seeded).toEqual(new Set(["a"]));
  });
});

describe("detectNewlyReady", () => {
  it("returns jobs that turned ready and were not notified yet", () => {
    const notified = new Set<string>();
    const jobs = [readyJob("a"), makeJob({ id: "b" })];

    const newlyReady = detectNewlyReady(jobs, NOW, notified);

    expect(newlyReady.map((job) => job.id)).toEqual(["a"]);
  });

  it("does not repeat notifications for known jobs", () => {
    const notified = new Set(["a"]);
    expect(detectNewlyReady([readyJob("a")], NOW, notified)).toEqual([]);
  });

  it("ignores collected jobs even when their time elapsed", () => {
    const collected = makeJob({
      id: "c",
      startedAt: "2026-07-14T10:00:00.000Z",
      status: "collected",
      collectedAt: "2026-07-14T11:30:00.000Z",
    });
    expect(detectNewlyReady([collected], NOW, new Set())).toEqual([]);
  });

  it("ignores jobs that are still processing", () => {
    expect(detectNewlyReady([makeJob()], NOW, new Set())).toEqual([]);
  });
});
