import { describe, expect, it } from "vitest";
import {
  containsLink,
  hasExcessiveCaps,
  hasRepeatedRun,
  normalizeForDuplicate,
} from "./spam-filter";

describe("containsLink", () => {
  it("detects http/https URLs", () => {
    expect(containsLink("schau mal https://example.com/x an")).toBe(true);
    expect(containsLink("http://spam.io")).toBe(true);
  });

  it("detects www. links without protocol", () => {
    expect(containsLink("besuch www.example.de jetzt")).toBe(true);
  });

  it("detects bare domains with common TLDs", () => {
    expect(containsLink("join my-server.gg now")).toBe(true);
    expect(containsLink("example.com")).toBe(true);
  });

  it("ignores version numbers and German abbreviations", () => {
    expect(containsLink("Patch 4.2.0 hat Mining geändert")).toBe(false);
    expect(containsLink("z.B. bei Daymar, d.h. auf dem Mond")).toBe(false);
    expect(containsLink("3.5 SCU Quantanium")).toBe(false);
  });
});

describe("hasExcessiveCaps", () => {
  it("flags long all-caps shouting", () => {
    expect(hasExcessiveCaps("HALLO LEUTE KAUFT MEINE ERZE JETZT")).toBe(true);
  });

  it("ignores short messages even in caps", () => {
    expect(hasExcessiveCaps("OK!!")).toBe(false);
    expect(hasExcessiveCaps("WTF")).toBe(false);
  });

  it("ignores normal sentences", () => {
    expect(hasExcessiveCaps("Heute gibt es viel Quantanium bei Lyria.")).toBe(
      false,
    );
  });

  it("ignores ore-code chatter", () => {
    expect(hasExcessiveCaps("QUAN BEXA HADA")).toBe(false);
  });
});

describe("hasRepeatedRun", () => {
  it("flags 8+ identical consecutive characters", () => {
    expect(hasRepeatedRun("neeeeeeeein")).toBe(true);
    expect(hasRepeatedRun("wow!!!!!!!!")).toBe(true);
  });

  it("allows short emphasis", () => {
    expect(hasRepeatedRun("neeein!!!")).toBe(false);
    expect(hasRepeatedRun("aaaa")).toBe(false);
  });
});

describe("normalizeForDuplicate", () => {
  it("normalizes case, punctuation and whitespace", () => {
    expect(normalizeForDuplicate("Hello,  WORLD!!")).toBe(
      normalizeForDuplicate("hello world"),
    );
  });

  it("keeps different messages distinct", () => {
    expect(normalizeForDuplicate("Quantanium bei Lyria")).not.toBe(
      normalizeForDuplicate("Quantanium bei Daymar"),
    );
  });
});
