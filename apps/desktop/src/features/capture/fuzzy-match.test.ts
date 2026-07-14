import { describe, expect, it } from "vitest";
import { fuzzyBestMatch, levenshtein } from "./fuzzy-match";

const ORES = [
  { key: "QUAN", aliases: ["Quantainium"] },
  { key: "LARA", aliases: ["Laranite"] },
  { key: "HADA", aliases: ["Hadanite", "Hadanit"] },
  { key: "GOLD", aliases: ["Gold"] },
];

describe("levenshtein", () => {
  it("is zero for identical strings", () => {
    expect(levenshtein("quan", "quan")).toBe(0);
  });

  it("counts substitutions, insertions and deletions", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
});

describe("fuzzyBestMatch", () => {
  it("matches exact names case-insensitively", () => {
    expect(fuzzyBestMatch("QUANTAINIUM", ORES)?.key).toBe("QUAN");
  });

  it("tolerates typical OCR errors", () => {
    // O statt Q und fehlendes i — typische OCR-Verleser
    expect(fuzzyBestMatch("OUANTAINUM", ORES)?.key).toBe("QUAN");
  });

  it("matches German alias names", () => {
    expect(fuzzyBestMatch("Hadanit", ORES)?.key).toBe("HADA");
  });

  it("rejects strings that are too different", () => {
    expect(fuzzyBestMatch("PROCESSING TIME", ORES)).toBeNull();
  });

  it("rejects empty input", () => {
    expect(fuzzyBestMatch("", ORES)).toBeNull();
  });
});
