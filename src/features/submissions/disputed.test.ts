import { describe, expect, it } from "vitest";
import { findDisputedKeys } from "./disputed";
import type { Submission } from "./submissions.schema";

function submission(overrides: Partial<Submission>): Submission {
  return {
    id: "s1",
    targetType: "oreOccurrence",
    targetKey: {
      oreCode: "HADA",
      systemCode: "STANTON",
      bodySlug: "daymar",
      method: "fps",
      patchVersion: "4.7",
    },
    proposedChange: {
      oreCode: "HADA",
      systemCode: "STANTON",
      bodySlug: "daymar",
      method: "fps",
      patchVersion: "4.7",
      probabilityPercent: 42,
    },
    submittedBy: "u1",
    createdAt: "2026-07-09",
    votes: { up: 3, down: 0 },
    voters: [],
    confidenceScore: 0.4,
    status: "pending",
    ...overrides,
  };
}

describe("findDisputedKeys", () => {
  it("marks corrections with at least 3 upvotes as disputed", () => {
    const keys = findDisputedKeys([submission({})]);
    expect(keys.has("HADA|fps")).toBe(true);
  });

  it("ignores new-entry submissions and weakly supported corrections", () => {
    const keys = findDisputedKeys([
      submission({ targetKey: null }),
      submission({ id: "s2", votes: { up: 2, down: 1 } }),
    ]);
    expect(keys.size).toBe(0);
  });
});
