import { describe, expect, it } from "vitest";
import { isJobReady, jobReadyAt, remainingMinutes } from "./job-time";

const JOB = {
  startedAt: "2026-07-14T10:00:00.000Z",
  durationMinutes: 90,
};

describe("job time helpers", () => {
  it("computes the ready timestamp", () => {
    expect(jobReadyAt(JOB)).toBe("2026-07-14T11:30:00.000Z");
  });

  it("reports readiness relative to a given now", () => {
    expect(isJobReady(JOB, Date.parse("2026-07-14T11:29:59.000Z"))).toBe(false);
    expect(isJobReady(JOB, Date.parse("2026-07-14T11:30:00.000Z"))).toBe(true);
    expect(isJobReady(JOB, Date.parse("2026-07-15T00:00:00.000Z"))).toBe(true);
  });

  it("clamps remaining minutes at zero and rounds up", () => {
    expect(remainingMinutes(JOB, Date.parse("2026-07-14T10:00:00.000Z"))).toBe(
      90,
    );
    expect(remainingMinutes(JOB, Date.parse("2026-07-14T11:29:01.000Z"))).toBe(
      1,
    );
    expect(remainingMinutes(JOB, Date.parse("2026-07-14T12:00:00.000Z"))).toBe(
      0,
    );
  });
});
