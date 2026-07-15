import { describe, expect, it } from "vitest";
import {
  collectJobInputSchema,
  JOB_MAX_ITEMS,
  refineryJobInputSchema,
  refineryJobSchema,
  type RefineryJob,
} from "./refinery-jobs.schema";

function makeJob(overrides: Partial<RefineryJob> = {}): RefineryJob {
  return {
    id: "job-1",
    ownerUserId: "user-1",
    terminalId: 32,
    terminalName: "ARC-L1 Wide Forest Station",
    starSystemName: "Stanton",
    methodCode: "DINYX",
    items: [{ oreCode: "QUAN", quantityScu: 32 }],
    durationMinutes: 90,
    startedAt: "2026-07-14T10:00:00.000Z",
    status: "processing",
    collectedAt: null,
    patchVersion: "4.7",
    createdAt: "2026-07-14T10:00:00.000Z",
    updatedAt: "2026-07-14T10:00:00.000Z",
    ...overrides,
  };
}

describe("refineryJobSchema", () => {
  it("parses a valid job", () => {
    expect(refineryJobSchema.parse(makeJob())).toEqual(makeJob());
  });

  it("rejects empty items and too many items", () => {
    expect(refineryJobSchema.safeParse(makeJob({ items: [] })).success).toBe(
      false,
    );
    const tooMany = Array.from({ length: JOB_MAX_ITEMS + 1 }, () => ({
      oreCode: "QUAN",
      quantityScu: 1,
    }));
    expect(
      refineryJobSchema.safeParse(makeJob({ items: tooMany })).success,
    ).toBe(false);
  });

  it("rejects non-positive and non-integer durations", () => {
    expect(
      refineryJobSchema.safeParse(makeJob({ durationMinutes: 0 })).success,
    ).toBe(false);
    expect(
      refineryJobSchema.safeParse(makeJob({ durationMinutes: 1.5 })).success,
    ).toBe(false);
  });

  it("rejects unknown status values", () => {
    const job = { ...makeJob(), status: "ready" };
    expect(refineryJobSchema.safeParse(job).success).toBe(false);
  });
});

describe("refineryJobInputSchema", () => {
  it("accepts user input without denormalized fields", () => {
    const parsed = refineryJobInputSchema.safeParse({
      terminalId: 32,
      methodCode: "DINYX",
      items: [{ oreCode: "QUAN", quantityScu: 32 }],
      durationMinutes: 90,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts an optional startedAt", () => {
    const parsed = refineryJobInputSchema.safeParse({
      terminalId: 32,
      methodCode: "DINYX",
      items: [{ oreCode: "QUAN", quantityScu: 32 }],
      durationMinutes: 90,
      startedAt: "2026-07-14T08:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects denormalized or extra fields", () => {
    const parsed = refineryJobInputSchema.safeParse({
      terminalId: 32,
      terminalName: "spoofed",
      methodCode: "DINYX",
      items: [{ oreCode: "QUAN", quantityScu: 32 }],
      durationMinutes: 90,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("collectJobInputSchema", () => {
  it("accepts an empty object and an explicit transfer", () => {
    expect(collectJobInputSchema.safeParse({}).success).toBe(true);
    expect(
      collectJobInputSchema.safeParse({
        transfer: [{ oreCode: "QUAN", quantityScu: 28.5 }],
      }).success,
    ).toBe(true);
  });

  it("rejects non-positive transfer quantities", () => {
    expect(
      collectJobInputSchema.safeParse({
        transfer: [{ oreCode: "QUAN", quantityScu: 0 }],
      }).success,
    ).toBe(false);
  });

  it("accepts a qualityRating on transfer items", () => {
    expect(
      collectJobInputSchema.safeParse({
        transfer: [{ oreCode: "QUAN", quantityScu: 28.5, qualityRating: 640 }],
      }).success,
    ).toBe(true);
  });
});

describe("qualityRating on job items", () => {
  it("parses items with a qualityRating in range", () => {
    const job = makeJob({
      items: [{ oreCode: "QUAN", quantityScu: 32, qualityRating: 850 }],
    });
    expect(refineryJobSchema.parse(job)).toEqual(job);
  });

  it("still parses items without a qualityRating (backward compatible)", () => {
    const job = makeJob({ items: [{ oreCode: "QUAN", quantityScu: 32 }] });
    expect(refineryJobSchema.safeParse(job).success).toBe(true);
    expect(refineryJobSchema.parse(job).items[0].qualityRating).toBeUndefined();
  });

  it("accepts the boundary values 0 and 1000", () => {
    for (const qualityRating of [0, 1000]) {
      const job = makeJob({
        items: [{ oreCode: "QUAN", quantityScu: 32, qualityRating }],
      });
      expect(refineryJobSchema.safeParse(job).success).toBe(true);
    }
  });

  it("rejects out-of-range and non-integer qualityRating", () => {
    for (const qualityRating of [-1, 1001, 12.5]) {
      const job = makeJob({
        items: [{ oreCode: "QUAN", quantityScu: 32, qualityRating }],
      });
      expect(refineryJobSchema.safeParse(job).success).toBe(false);
    }
  });

  it("accepts a nested qualityRating through the input schema", () => {
    const parsed = refineryJobInputSchema.safeParse({
      terminalId: 32,
      methodCode: "DINYX",
      items: [{ oreCode: "QUAN", quantityScu: 32, qualityRating: 500 }],
      durationMinutes: 90,
    });
    expect(parsed.success).toBe(true);
  });
});
